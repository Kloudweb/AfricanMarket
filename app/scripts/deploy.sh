
#!/bin/bash

# AfricanMarket Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: staging, production

set -e

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="africanmarket"
DOCKER_REGISTRY="your-registry.com"
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if environment file exists
    if [[ ! -f ".env.${ENVIRONMENT}" ]]; then
        error "Environment file .env.${ENVIRONMENT} not found."
        error "Please copy .env.${ENVIRONMENT}.template to .env.${ENVIRONMENT} and configure it."
        exit 1
    fi

    log "Prerequisites check completed successfully."
}

# Create backup
create_backup() {
    log "Creating database backup..."
    
    # Load environment variables
    source ".env.${ENVIRONMENT}"
    
    # Create backup directory
    mkdir -p backups
    
    # Generate backup filename
    BACKUP_FILE="backups/${PROJECT_NAME}_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create database backup
    if docker ps | grep -q "${PROJECT_NAME}_postgres"; then
        docker exec "${PROJECT_NAME}_postgres" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${BACKUP_FILE}"
        log "Database backup created: ${BACKUP_FILE}"
    else
        warning "Database container not found. Skipping backup."
    fi
    
    # Clean old backups
    find backups -name "${PROJECT_NAME}_${ENVIRONMENT}_*.sql" -mtime +${BACKUP_RETENTION_DAYS} -delete
    log "Old backups cleaned up (retention: ${BACKUP_RETENTION_DAYS} days)"
}

# Build and deploy
build_and_deploy() {
    log "Building and deploying ${PROJECT_NAME} to ${ENVIRONMENT}..."
    
    # Stop existing containers
    info "Stopping existing containers..."
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" down || true
    
    # Build new image
    info "Building new Docker image..."
    docker build -t "${PROJECT_NAME}:${ENVIRONMENT}" .
    
    # Tag for registry if needed
    if [[ ! -z "${DOCKER_REGISTRY}" ]]; then
        docker tag "${PROJECT_NAME}:${ENVIRONMENT}" "${DOCKER_REGISTRY}/${PROJECT_NAME}:${ENVIRONMENT}"
        info "Tagged image for registry: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${ENVIRONMENT}"
    fi
    
    # Start containers
    info "Starting containers..."
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" up -d
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    info "Running database migrations..."
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app yarn prisma migrate deploy
    
    log "Deployment completed successfully!"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Load environment variables
    source ".env.${ENVIRONMENT}"
    
    # Get the application URL
    APP_URL=${NEXTAUTH_URL:-"http://localhost:3000"}
    
    # Perform health check
    for i in {1..10}; do
        if curl -f "${APP_URL}/api/health" &> /dev/null; then
            log "Health check passed!"
            return 0
        fi
        info "Attempt ${i}/10: Waiting for application to be ready..."
        sleep 10
    done
    
    error "Health check failed after 10 attempts."
    return 1
}

# Rollback function
rollback() {
    error "Deployment failed. Rolling back..."
    
    # Stop failed deployment
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" down || true
    
    # Restore from latest backup
    LATEST_BACKUP=$(ls -t backups/${PROJECT_NAME}_${ENVIRONMENT}_*.sql 2>/dev/null | head -n1)
    
    if [[ -f "${LATEST_BACKUP}" ]]; then
        warning "Restoring from backup: ${LATEST_BACKUP}"
        # Add restoration logic here
    else
        warning "No backup found for rollback."
    fi
    
    error "Rollback completed. Please check the logs and fix issues before redeploying."
    exit 1
}

# Main deployment process
main() {
    log "Starting ${PROJECT_NAME} deployment to ${ENVIRONMENT}"
    log "================================================"
    
    # Trap errors for rollback
    trap rollback ERR
    
    # Run deployment steps
    check_prerequisites
    create_backup
    build_and_deploy
    
    # Perform health check
    if health_check; then
        log "================================================"
        log "Deployment to ${ENVIRONMENT} completed successfully! 🚀"
        log "Application is running at: $(source .env.${ENVIRONMENT} && echo ${NEXTAUTH_URL})"
    else
        error "Health check failed. Please check the application logs."
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [environment]"
    echo "Environments: staging, production"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Deploy to staging"
    echo "  $0 production  # Deploy to production"
    echo "  $0             # Deploy to production (default)"
}

# Check arguments
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT"
    usage
    exit 1
fi

# Run main function
main "$@"
