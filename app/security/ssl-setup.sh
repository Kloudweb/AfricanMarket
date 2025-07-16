
#!/bin/bash

# SSL Certificate Setup Script for AfricanMarket
# Supports Let's Encrypt, custom certificates, and development setup

set -e

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}
ENVIRONMENT=${3:-"production"}
NGINX_CONFIG_PATH="/etc/nginx/sites-available/africanmarket"
SSL_PATH="/etc/nginx/ssl"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Update package list
    apt update
    
    # Install certbot and nginx
    apt install -y certbot python3-certbot-nginx nginx openssl
    
    log "Dependencies installed successfully"
}

# Setup Let's Encrypt SSL
setup_letsencrypt() {
    log "Setting up Let's Encrypt SSL for ${DOMAIN}..."
    
    # Validate domain
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        error "Invalid domain format: $DOMAIN"
        exit 1
    fi
    
    # Stop nginx temporarily
    systemctl stop nginx || true
    
    # Obtain certificate
    certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN" \
        --non-interactive
    
    if [[ $? -eq 0 ]]; then
        log "Let's Encrypt certificate obtained successfully"
        
        # Setup auto-renewal
        setup_auto_renewal
        
        # Update nginx configuration
        update_nginx_ssl_config "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "/etc/letsencrypt/live/$DOMAIN/privkey.pem"
        
    else
        error "Failed to obtain Let's Encrypt certificate"
        exit 1
    fi
}

# Setup custom SSL certificate
setup_custom_ssl() {
    log "Setting up custom SSL certificate..."
    
    mkdir -p "$SSL_PATH"
    
    # Check if certificate files exist
    if [[ ! -f "$SSL_PATH/cert.pem" ]] || [[ ! -f "$SSL_PATH/key.pem" ]]; then
        error "Certificate files not found in $SSL_PATH"
        error "Please place your certificate as cert.pem and private key as key.pem"
        exit 1
    fi
    
    # Validate certificate
    if openssl x509 -in "$SSL_PATH/cert.pem" -text -noout > /dev/null 2>&1; then
        log "Certificate validation passed"
    else
        error "Certificate validation failed"
        exit 1
    fi
    
    # Set proper permissions
    chmod 644 "$SSL_PATH/cert.pem"
    chmod 600 "$SSL_PATH/key.pem"
    chown root:root "$SSL_PATH"/*
    
    # Update nginx configuration
    update_nginx_ssl_config "$SSL_PATH/cert.pem" "$SSL_PATH/key.pem"
    
    log "Custom SSL certificate setup completed"
}

# Setup development SSL (self-signed)
setup_development_ssl() {
    log "Setting up development SSL (self-signed)..."
    
    mkdir -p "$SSL_PATH"
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_PATH/key.pem" \
        -out "$SSL_PATH/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Set proper permissions
    chmod 644 "$SSL_PATH/cert.pem"
    chmod 600 "$SSL_PATH/key.pem"
    
    # Update nginx configuration
    update_nginx_ssl_config "$SSL_PATH/cert.pem" "$SSL_PATH/key.pem"
    
    warning "Development SSL certificate created"
    warning "This certificate is self-signed and should NOT be used in production"
}

# Update nginx SSL configuration
update_nginx_ssl_config() {
    local cert_path=$1
    local key_path=$2
    
    log "Updating nginx SSL configuration..."
    
    # Backup existing configuration
    if [[ -f "$NGINX_CONFIG_PATH" ]]; then
        cp "$NGINX_CONFIG_PATH" "$NGINX_CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create nginx configuration with SSL
    cat > "$NGINX_CONFIG_PATH" << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate $cert_path;
    ssl_certificate_key $key_path;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 5m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss: ws:;" always;
    
    # Root directory and index
    root /var/www/africanmarket;
    index index.html;
    
    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security and performance optimizations
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Block sensitive files
    location ~ /\\. {
        deny all;
        return 404;
    }
    
    location ~ ^/(\\.|node_modules|package\\.json) {
        deny all;
        return 404;
    }
}
EOF
    
    # Enable the site
    ln -sf "$NGINX_CONFIG_PATH" "/etc/nginx/sites-enabled/africanmarket"
    rm -f "/etc/nginx/sites-enabled/default"
    
    # Test nginx configuration
    if nginx -t; then
        log "Nginx configuration test passed"
        systemctl restart nginx
        log "Nginx restarted successfully"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# Setup auto-renewal for Let's Encrypt
setup_auto_renewal() {
    log "Setting up auto-renewal for Let's Encrypt..."
    
    # Create renewal hook script
    cat > "/etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh" << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    
    chmod +x "/etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh"
    
    # Test auto-renewal
    certbot renew --dry-run
    
    if [[ $? -eq 0 ]]; then
        log "Auto-renewal test passed"
    else
        warning "Auto-renewal test failed"
    fi
}

# Generate Diffie-Hellman parameters
generate_dhparam() {
    log "Generating Diffie-Hellman parameters (this may take a while)..."
    
    if [[ ! -f "/etc/nginx/dhparam.pem" ]]; then
        openssl dhparam -out "/etc/nginx/dhparam.pem" 2048
        log "Diffie-Hellman parameters generated"
    else
        log "Diffie-Hellman parameters already exist"
    fi
}

# Main function
main() {
    log "Starting SSL setup for AfricanMarket ($ENVIRONMENT)"
    log "Domain: $DOMAIN"
    log "Email: $EMAIL"
    log "=============================================="
    
    check_root
    install_dependencies
    generate_dhparam
    
    case $ENVIRONMENT in
        "production")
            setup_letsencrypt
            ;;
        "staging")
            setup_letsencrypt
            ;;
        "development")
            setup_development_ssl
            ;;
        "custom")
            setup_custom_ssl
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            error "Valid environments: production, staging, development, custom"
            exit 1
            ;;
    esac
    
    log "=============================================="
    log "SSL setup completed successfully! 🔒"
    log "Your site is now secured with HTTPS"
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        warning "Remember: Development certificates are self-signed"
        warning "Browsers will show security warnings"
    fi
}

# Usage information
usage() {
    echo "Usage: $0 [domain] [email] [environment]"
    echo ""
    echo "Arguments:"
    echo "  domain      - Your domain name (default: your-domain.com)"
    echo "  email       - Email for Let's Encrypt registration"
    echo "  environment - production|staging|development|custom"
    echo ""
    echo "Examples:"
    echo "  $0 example.com admin@example.com production"
    echo "  $0 staging.example.com admin@example.com staging"
    echo "  $0 localhost admin@example.com development"
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"
