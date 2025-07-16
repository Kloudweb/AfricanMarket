
#!/bin/bash

# AfricanMarket Database Backup Script
# Usage: ./scripts/backup.sh [environment] [backup-type]
# Environments: staging, production
# Backup types: full, incremental

set -e

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_TYPE=${2:-full}
PROJECT_NAME="africanmarket"
BACKUP_DIR="backups"
RETENTION_DAYS=30
S3_BUCKET=${BACKUP_S3_BUCKET:-""}

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

# Load environment variables
load_env() {
    if [[ -f ".env.${ENVIRONMENT}" ]]; then
        source ".env.${ENVIRONMENT}"
        log "Loaded environment variables for ${ENVIRONMENT}"
    else
        error "Environment file .env.${ENVIRONMENT} not found"
        exit 1
    fi
}

# Create backup directory
setup_backup_dir() {
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}/database"
    mkdir -p "${BACKUP_DIR}/files"
    log "Backup directories created"
}

# Database backup
backup_database() {
    log "Starting database backup (${BACKUP_TYPE})..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/database/${PROJECT_NAME}_${ENVIRONMENT}_${BACKUP_TYPE}_${TIMESTAMP}.sql"
    
    # Check if database container is running
    if docker ps | grep -q "${PROJECT_NAME}_postgres"; then
        log "Creating database backup..."
        
        # Full backup
        if [[ "$BACKUP_TYPE" == "full" ]]; then
            docker exec "${PROJECT_NAME}_postgres" pg_dump \
                -U "${POSTGRES_USER}" \
                -h localhost \
                -p 5432 \
                --verbose \
                --clean \
                --if-exists \
                --create \
                "${POSTGRES_DB}" > "${BACKUP_FILE}"
        
        # Incremental backup (using pg_basebackup for WAL)
        elif [[ "$BACKUP_TYPE" == "incremental" ]]; then
            INCREMENTAL_DIR="${BACKUP_DIR}/database/incremental_${TIMESTAMP}"
            mkdir -p "${INCREMENTAL_DIR}"
            
            docker exec "${PROJECT_NAME}_postgres" pg_basebackup \
                -U "${POSTGRES_USER}" \
                -h localhost \
                -D "/tmp/backup" \
                -Ft \
                -z \
                -P \
                -W
                
            docker cp "${PROJECT_NAME}_postgres:/tmp/backup" "${INCREMENTAL_DIR}/"
        fi
        
        # Compress the backup
        gzip "${BACKUP_FILE}"
        log "Database backup completed: ${BACKUP_FILE}.gz"
        
        # Verify backup
        if [[ -f "${BACKUP_FILE}.gz" ]]; then
            BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            log "Backup size: ${BACKUP_SIZE}"
        else
            error "Backup file not created"
            exit 1
        fi
        
    else
        error "Database container not running"
        exit 1
    fi
}

# Files backup (user uploads, etc.)
backup_files() {
    log "Starting files backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    FILES_BACKUP="${BACKUP_DIR}/files/${PROJECT_NAME}_files_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
    
    # Backup uploaded files and other important directories
    tar -czf "${FILES_BACKUP}" \
        -C . \
        public/uploads \
        .next/static \
        prisma/migrations \
        2>/dev/null || warning "Some files may not exist, continuing..."
    
    if [[ -f "${FILES_BACKUP}" ]]; then
        FILES_SIZE=$(du -h "${FILES_BACKUP}" | cut -f1)
        log "Files backup completed: ${FILES_BACKUP} (${FILES_SIZE})"
    else
        warning "Files backup failed or no files to backup"
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [[ -n "${S3_BUCKET}" && -n "${AWS_ACCESS_KEY_ID}" ]]; then
        log "Uploading backups to S3..."
        
        # Upload database backup
        aws s3 cp "${BACKUP_DIR}/" "s3://${S3_BUCKET}/backups/${ENVIRONMENT}/" \
            --recursive \
            --exclude "*" \
            --include "*.gz" \
            --include "*.tar.gz"
        
        log "Backups uploaded to S3 bucket: ${S3_BUCKET}"
    else
        warning "S3 configuration not found, skipping cloud upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Local cleanup
    find "${BACKUP_DIR}" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    # S3 cleanup (if configured)
    if [[ -n "${S3_BUCKET}" && -n "${AWS_ACCESS_KEY_ID}" ]]; then
        aws s3 ls "s3://${S3_BUCKET}/backups/${ENVIRONMENT}/" | \
        while read -r line; do
            BACKUP_DATE=$(echo "$line" | awk '{print $1}')
            BACKUP_FILE=$(echo "$line" | awk '{print $4}')
            
            if [[ $(date -d "$BACKUP_DATE" +%s) -lt $(date -d "${RETENTION_DAYS} days ago" +%s) ]]; then
                aws s3 rm "s3://${S3_BUCKET}/backups/${ENVIRONMENT}/${BACKUP_FILE}"
            fi
        done
    fi
    
    log "Old backups cleaned up (retention: ${RETENTION_DAYS} days)"
}

# Test backup integrity
test_backup() {
    log "Testing backup integrity..."
    
    LATEST_DB_BACKUP=$(ls -t "${BACKUP_DIR}/database/"*.gz 2>/dev/null | head -n1)
    
    if [[ -f "${LATEST_DB_BACKUP}" ]]; then
        # Test if the gzipped file is valid
        if gzip -t "${LATEST_DB_BACKUP}"; then
            log "Database backup integrity test passed"
        else
            error "Database backup integrity test failed"
            exit 1
        fi
        
        # Test if SQL content is valid (basic check)
        if zcat "${LATEST_DB_BACKUP}" | head -20 | grep -q "PostgreSQL database dump"; then
            log "Database backup content validation passed"
        else
            warning "Database backup content validation inconclusive"
        fi
    else
        error "No database backup found for testing"
        exit 1
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🗄️ Backup ${status}: ${message}\"}" \
            "${SLACK_WEBHOOK_URL}" || warning "Failed to send Slack notification"
    fi
    
    if [[ -n "${SENDGRID_API_KEY}" && -n "${SUPPORT_EMAIL}" ]]; then
        # Send email notification (implement as needed)
        log "Email notification would be sent to ${SUPPORT_EMAIL}"
    fi
}

# Main backup process
main() {
    log "Starting ${PROJECT_NAME} backup (${ENVIRONMENT} - ${BACKUP_TYPE})"
    log "==============================================="
    
    load_env
    setup_backup_dir
    
    # Perform backups
    backup_database
    backup_files
    
    # Upload to cloud storage
    upload_to_s3
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Test backup integrity
    test_backup
    
    # Send success notification
    send_notification "completed" "Backup completed successfully for ${ENVIRONMENT}"
    
    log "==============================================="
    log "Backup process completed successfully! ✅"
}

# Error handling
handle_error() {
    error "Backup process failed"
    send_notification "failed" "Backup failed for ${ENVIRONMENT}"
    exit 1
}

trap handle_error ERR

# Usage
usage() {
    echo "Usage: $0 [environment] [backup-type]"
    echo "Environments: staging, production"
    echo "Backup types: full, incremental"
    echo ""
    echo "Examples:"
    echo "  $0 production full        # Full production backup"
    echo "  $0 staging incremental    # Incremental staging backup"
    echo "  $0                        # Full production backup (default)"
}

# Validate arguments
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT"
    usage
    exit 1
fi

if [[ "$BACKUP_TYPE" != "full" && "$BACKUP_TYPE" != "incremental" ]]; then
    error "Invalid backup type: $BACKUP_TYPE"
    usage
    exit 1
fi

# Run main function
main "$@"
