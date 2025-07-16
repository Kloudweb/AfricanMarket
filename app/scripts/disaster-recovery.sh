
#!/bin/bash

# AfricanMarket Disaster Recovery Script
# Complete system recovery from catastrophic failure

set -e

# Configuration
ENVIRONMENT=${1:-production}
RECOVERY_TYPE=${2:-full}
PROJECT_NAME="africanmarket"
BACKUP_DIR="backups"
RECOVERY_DIR="recovery"
DR_CONFIG_FILE="disaster-recovery.config"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

critical() {
    echo -e "${PURPLE}[CRITICAL] $1${NC}"
}

# Display usage
usage() {
    echo "Usage: $0 [environment] [recovery-type]"
    echo ""
    echo "Arguments:"
    echo "  environment    - Environment to recover (production, staging)"
    echo "  recovery-type  - Type of recovery (full, database, files, config)"
    echo ""
    echo "Recovery Types:"
    echo "  full      - Complete system recovery (database + files + config)"
    echo "  database  - Database recovery only"
    echo "  files     - File system recovery only"
    echo "  config    - Configuration recovery only"
    echo ""
    echo "Examples:"
    echo "  $0 production full"
    echo "  $0 staging database"
}

# Load disaster recovery configuration
load_dr_config() {
    if [[ -f "$DR_CONFIG_FILE" ]]; then
        source "$DR_CONFIG_FILE"
        log "Loaded disaster recovery configuration"
    else
        warning "DR configuration file not found, using defaults"
        
        # Default configuration
        BACKUP_RETENTION_DAYS=30
        MAX_RECOVERY_TIME_HOURS=4
        NOTIFICATION_EMAILS="admin@africanmarket.com"
        BACKUP_STORAGE_TYPE="local"
        MONITORING_ENABLED=true
    fi
}

# Assess disaster scope
assess_disaster() {
    critical "🚨 DISASTER RECOVERY MODE ACTIVATED 🚨"
    critical "Assessing system damage..."
    
    local damage_report="${RECOVERY_DIR}/damage_assessment_$(date +%Y%m%d_%H%M%S).log"
    mkdir -p "$RECOVERY_DIR"
    
    {
        echo "=== DISASTER RECOVERY ASSESSMENT ==="
        echo "Timestamp: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Recovery Type: $RECOVERY_TYPE"
        echo ""
        
        # Check database connectivity
        echo "=== DATABASE STATUS ==="
        if docker ps | grep -q "${PROJECT_NAME}_postgres"; then
            echo "✓ Database container is running"
            if docker exec "${PROJECT_NAME}_postgres" pg_isready -U "${POSTGRES_USER}" &>/dev/null; then
                echo "✓ Database is accepting connections"
            else
                echo "✗ Database is not accepting connections"
            fi
        else
            echo "✗ Database container is not running"
        fi
        
        # Check application status
        echo ""
        echo "=== APPLICATION STATUS ==="
        if docker ps | grep -q "${PROJECT_NAME}_app"; then
            echo "✓ Application container is running"
            if curl -f "http://localhost:3000/api/health" &>/dev/null; then
                echo "✓ Application is responding"
            else
                echo "✗ Application is not responding"
            fi
        else
            echo "✗ Application container is not running"
        fi
        
        # Check file system
        echo ""
        echo "=== FILE SYSTEM STATUS ==="
        if [[ -d "public/uploads" ]]; then
            echo "✓ Uploads directory exists"
            echo "Upload files count: $(find public/uploads -type f 2>/dev/null | wc -l)"
        else
            echo "✗ Uploads directory missing"
        fi
        
        # Check configuration files
        echo ""
        echo "=== CONFIGURATION STATUS ==="
        local config_files=(".env.${ENVIRONMENT}" "docker-compose.${ENVIRONMENT}.yml" "nginx.conf")
        for file in "${config_files[@]}"; do
            if [[ -f "$file" ]]; then
                echo "✓ $file exists"
            else
                echo "✗ $file missing"
            fi
        done
        
        # Check disk space
        echo ""
        echo "=== SYSTEM RESOURCES ==="
        echo "Disk usage:"
        df -h /
        echo ""
        echo "Memory usage:"
        free -h
        
    } | tee "$damage_report"
    
    info "Damage assessment saved to: $damage_report"
}

# Find latest backups
find_latest_backups() {
    log "Locating latest backups..."
    
    # Database backup
    LATEST_DB_BACKUP=$(ls -t "${BACKUP_DIR}/database/"*"${ENVIRONMENT}"*.sql.gz 2>/dev/null | head -n1)
    if [[ -n "$LATEST_DB_BACKUP" ]]; then
        info "Latest database backup: $LATEST_DB_BACKUP"
        info "Backup date: $(stat -c %y "$LATEST_DB_BACKUP")"
    else
        error "No database backup found for $ENVIRONMENT"
        return 1
    fi
    
    # Files backup
    LATEST_FILES_BACKUP=$(ls -t "${BACKUP_DIR}/files/"*"${ENVIRONMENT}"*.tar.gz 2>/dev/null | head -n1)
    if [[ -n "$LATEST_FILES_BACKUP" ]]; then
        info "Latest files backup: $LATEST_FILES_BACKUP"
    else
        warning "No files backup found for $ENVIRONMENT"
    fi
    
    # Configuration backup
    LATEST_CONFIG_BACKUP=$(ls -t "${BACKUP_DIR}/config/"*"${ENVIRONMENT}"*.tar.gz 2>/dev/null | head -n1)
    if [[ -n "$LATEST_CONFIG_BACKUP" ]]; then
        info "Latest config backup: $LATEST_CONFIG_BACKUP"
    else
        warning "No configuration backup found for $ENVIRONMENT"
    fi
}

# Download backups from cloud storage
download_cloud_backups() {
    if [[ "$BACKUP_STORAGE_TYPE" == "s3" && -n "$AWS_ACCESS_KEY_ID" ]]; then
        log "Downloading backups from S3..."
        
        aws s3 sync "s3://${BACKUP_S3_BUCKET}/backups/${ENVIRONMENT}/" "${BACKUP_DIR}/" \
            --exclude "*" --include "*.gz" --include "*.tar.gz"
        
        log "Cloud backups downloaded"
    else
        info "Using local backups only"
    fi
}

# Validate backup integrity
validate_backups() {
    log "Validating backup integrity..."
    
    # Validate database backup
    if [[ -n "$LATEST_DB_BACKUP" ]]; then
        if gzip -t "$LATEST_DB_BACKUP"; then
            log "✓ Database backup integrity check passed"
        else
            error "✗ Database backup is corrupted"
            return 1
        fi
        
        # Check if it's a valid PostgreSQL dump
        if zcat "$LATEST_DB_BACKUP" | head -20 | grep -q "PostgreSQL database dump"; then
            log "✓ Database backup content validation passed"
        else
            error "✗ Database backup content is invalid"
            return 1
        fi
    fi
    
    # Validate files backup
    if [[ -n "$LATEST_FILES_BACKUP" ]]; then
        if tar -tzf "$LATEST_FILES_BACKUP" >/dev/null 2>&1; then
            log "✓ Files backup integrity check passed"
        else
            warning "✗ Files backup integrity check failed"
        fi
    fi
    
    # Validate config backup
    if [[ -n "$LATEST_CONFIG_BACKUP" ]]; then
        if tar -tzf "$LATEST_CONFIG_BACKUP" >/dev/null 2>&1; then
            log "✓ Configuration backup integrity check passed"
        else
            warning "✗ Configuration backup integrity check failed"
        fi
    fi
}

# Stop all services
stop_all_services() {
    log "Stopping all application services..."
    
    # Stop docker containers
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" down || true
    
    # Stop nginx if running
    sudo systemctl stop nginx || true
    
    # Kill any remaining processes
    pkill -f "node.*africanmarket" || true
    
    log "All services stopped"
}

# Recover database
recover_database() {
    if [[ "$RECOVERY_TYPE" == "database" || "$RECOVERY_TYPE" == "full" ]]; then
        log "Starting database recovery..."
        
        if [[ -z "$LATEST_DB_BACKUP" ]]; then
            error "No database backup available for recovery"
            return 1
        fi
        
        # Start database container
        docker-compose -f "docker-compose.${ENVIRONMENT}.yml" up -d postgres
        
        # Wait for database to be ready
        log "Waiting for database to initialize..."
        sleep 30
        
        # Drop and recreate database
        docker exec "${PROJECT_NAME}_postgres" psql \
            -U "${POSTGRES_USER}" \
            -d postgres \
            -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" || true
            
        docker exec "${PROJECT_NAME}_postgres" psql \
            -U "${POSTGRES_USER}" \
            -d postgres \
            -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
        
        # Restore database
        log "Restoring database from backup..."
        zcat "$LATEST_DB_BACKUP" | docker exec -i "${PROJECT_NAME}_postgres" psql \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            --set ON_ERROR_STOP=on
        
        log "✓ Database recovery completed"
    fi
}

# Recover files
recover_files() {
    if [[ "$RECOVERY_TYPE" == "files" || "$RECOVERY_TYPE" == "full" ]]; then
        log "Starting files recovery..."
        
        if [[ -n "$LATEST_FILES_BACKUP" ]]; then
            # Extract files backup
            tar -xzf "$LATEST_FILES_BACKUP" -C .
            log "✓ Files recovery completed"
        else
            warning "No files backup available, skipping files recovery"
        fi
    fi
}

# Recover configuration
recover_configuration() {
    if [[ "$RECOVERY_TYPE" == "config" || "$RECOVERY_TYPE" == "full" ]]; then
        log "Starting configuration recovery..."
        
        if [[ -n "$LATEST_CONFIG_BACKUP" ]]; then
            # Extract configuration backup
            tar -xzf "$LATEST_CONFIG_BACKUP" -C .
            log "✓ Configuration recovery completed"
        else
            warning "No configuration backup available"
            
            # Create basic configuration from templates
            log "Creating basic configuration from templates..."
            
            if [[ ! -f ".env.${ENVIRONMENT}" ]] && [[ -f ".env.${ENVIRONMENT}.template" ]]; then
                cp ".env.${ENVIRONMENT}.template" ".env.${ENVIRONMENT}"
                warning "Created .env.${ENVIRONMENT} from template - MUST BE CONFIGURED"
            fi
        fi
    fi
}

# Restore application services
restore_services() {
    log "Restoring application services..."
    
    # Start all services
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" up -d
    
    # Wait for services to initialize
    log "Waiting for services to initialize..."
    sleep 60
    
    # Run database migrations if needed
    if [[ -f "prisma/schema.prisma" ]]; then
        log "Running database migrations..."
        docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app yarn prisma migrate deploy || true
    fi
    
    # Clear caches
    if docker ps | grep -q "${PROJECT_NAME}_redis"; then
        log "Clearing application caches..."
        docker exec "${PROJECT_NAME}_redis" redis-cli FLUSHALL || true
    fi
    
    log "✓ Application services restored"
}

# Verify system recovery
verify_recovery() {
    log "Verifying system recovery..."
    
    local verification_report="${RECOVERY_DIR}/verification_$(date +%Y%m%d_%H%M%S).log"
    
    {
        echo "=== DISASTER RECOVERY VERIFICATION ==="
        echo "Timestamp: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Recovery Type: $RECOVERY_TYPE"
        echo ""
        
        # Test database
        echo "=== DATABASE VERIFICATION ==="
        if docker exec "${PROJECT_NAME}_postgres" psql \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            -c "SELECT version();" &>/dev/null; then
            echo "✓ Database is accessible"
            
            # Check table counts
            local table_count=$(docker exec "${PROJECT_NAME}_postgres" psql \
                -U "${POSTGRES_USER}" \
                -d "${POSTGRES_DB}" \
                -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
            echo "✓ Number of tables: $table_count"
        else
            echo "✗ Database verification failed"
        fi
        
        # Test application
        echo ""
        echo "=== APPLICATION VERIFICATION ==="
        sleep 15
        if curl -f "http://localhost:3000/api/health" &>/dev/null; then
            echo "✓ Application health check passed"
        else
            echo "✗ Application health check failed"
        fi
        
        # Test critical endpoints
        local endpoints=("/api/health" "/api/auth/session")
        for endpoint in "${endpoints[@]}"; do
            if curl -f "http://localhost:3000${endpoint}" &>/dev/null; then
                echo "✓ Endpoint $endpoint is responding"
            else
                echo "✗ Endpoint $endpoint is not responding"
            fi
        done
        
    } | tee "$verification_report"
    
    info "Verification report saved to: $verification_report"
}

# Generate recovery report
generate_recovery_report() {
    log "Generating recovery report..."
    
    local report_file="${RECOVERY_DIR}/recovery_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Disaster Recovery Report

## Recovery Summary
- **Date**: $(date)
- **Environment**: $ENVIRONMENT
- **Recovery Type**: $RECOVERY_TYPE
- **Duration**: $(($(date +%s) - $RECOVERY_START_TIME)) seconds
- **Status**: $(if [[ $? -eq 0 ]]; then echo "SUCCESS"; else echo "FAILED"; fi)

## Backups Used
$(if [[ -n "$LATEST_DB_BACKUP" ]]; then echo "- **Database**: $LATEST_DB_BACKUP"; fi)
$(if [[ -n "$LATEST_FILES_BACKUP" ]]; then echo "- **Files**: $LATEST_FILES_BACKUP"; fi)
$(if [[ -n "$LATEST_CONFIG_BACKUP" ]]; then echo "- **Configuration**: $LATEST_CONFIG_BACKUP"; fi)

## Recovery Steps Performed
1. System assessment and damage evaluation
2. Backup location and validation
$(if [[ "$RECOVERY_TYPE" == "database" || "$RECOVERY_TYPE" == "full" ]]; then echo "3. Database recovery"; fi)
$(if [[ "$RECOVERY_TYPE" == "files" || "$RECOVERY_TYPE" == "full" ]]; then echo "4. Files recovery"; fi)
$(if [[ "$RECOVERY_TYPE" == "config" || "$RECOVERY_TYPE" == "full" ]]; then echo "5. Configuration recovery"; fi)
6. Service restoration
7. System verification

## Post-Recovery Actions Required
- [ ] Verify all application functionality
- [ ] Check data integrity
- [ ] Update DNS records if needed
- [ ] Notify stakeholders
- [ ] Schedule post-mortem meeting
- [ ] Update disaster recovery procedures

## Files Generated
- Damage assessment: ${RECOVERY_DIR}/damage_assessment_*.log
- Verification report: ${RECOVERY_DIR}/verification_*.log
- Recovery report: $report_file

## Notes
$(cat "${RECOVERY_DIR}/damage_assessment_"*.log | grep "✗" || echo "No critical issues identified")
EOF

    log "Recovery report generated: $report_file"
}

# Send recovery notifications
send_recovery_notifications() {
    local status=$1
    local message="🚨 Disaster recovery $status for $ENVIRONMENT environment"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\",\"channel\":\"#alerts\"}" \
            "$SLACK_WEBHOOK_URL" || warning "Failed to send Slack notification"
    fi
    
    # Email notification
    if [[ -n "$NOTIFICATION_EMAILS" ]]; then
        echo "$message" | mail -s "AfricanMarket Disaster Recovery $status" "$NOTIFICATION_EMAILS" || warning "Failed to send email notification"
    fi
    
    log "Recovery notifications sent"
}

# Main disaster recovery process
main() {
    RECOVERY_START_TIME=$(date +%s)
    
    critical "🚨 INITIATING DISASTER RECOVERY PROTOCOL 🚨"
    critical "Environment: $ENVIRONMENT"
    critical "Recovery Type: $RECOVERY_TYPE"
    critical "=========================================="
    
    # Load configuration
    load_dr_config
    
    # Assess the situation
    assess_disaster
    
    # Load environment variables
    if [[ -f ".env.${ENVIRONMENT}" ]]; then
        source ".env.${ENVIRONMENT}"
    else
        error "Environment file not found: .env.${ENVIRONMENT}"
        exit 1
    fi
    
    # Download backups if needed
    download_cloud_backups
    
    # Find and validate backups
    find_latest_backups
    validate_backups
    
    # Stop all services
    stop_all_services
    
    # Perform recovery based on type
    case $RECOVERY_TYPE in
        "full")
            recover_database
            recover_files
            recover_configuration
            ;;
        "database")
            recover_database
            ;;
        "files")
            recover_files
            ;;
        "config")
            recover_configuration
            ;;
        *)
            error "Invalid recovery type: $RECOVERY_TYPE"
            exit 1
            ;;
    esac
    
    # Restore services
    restore_services
    
    # Verify recovery
    verify_recovery
    
    # Generate report
    generate_recovery_report
    
    # Send notifications
    send_recovery_notifications "COMPLETED"
    
    critical "=========================================="
    critical "🎉 DISASTER RECOVERY COMPLETED SUCCESSFULLY"
    critical "Duration: $(($(date +%s) - $RECOVERY_START_TIME)) seconds"
    critical "Environment: $ENVIRONMENT"
    critical "=========================================="
    
    warning "IMPORTANT POST-RECOVERY TASKS:"
    warning "1. Verify all application functionality"
    warning "2. Check data integrity and consistency"
    warning "3. Monitor system performance"
    warning "4. Update team and stakeholders"
    warning "5. Schedule post-mortem analysis"
}

# Error handling
handle_recovery_error() {
    critical "DISASTER RECOVERY FAILED"
    
    # Send failure notification
    send_recovery_notifications "FAILED"
    
    # Generate failure report
    generate_recovery_report
    
    error "Recovery process terminated with errors"
    error "Check logs and contact system administrator"
    
    exit 1
}

trap handle_recovery_error ERR

# Validate arguments
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment: $ENVIRONMENT"
    usage
    exit 1
fi

if [[ "$RECOVERY_TYPE" != "full" && "$RECOVERY_TYPE" != "database" && "$RECOVERY_TYPE" != "files" && "$RECOVERY_TYPE" != "config" ]]; then
    error "Invalid recovery type: $RECOVERY_TYPE"
    usage
    exit 1
fi

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"
