
#!/bin/bash

# AfricanMarket Database Restoration Script
# Usage: ./scripts/restore.sh [backup-file] [environment]

set -e

# Configuration
BACKUP_FILE=${1}
ENVIRONMENT=${2:-production}
PROJECT_NAME="africanmarket"
BACKUP_DIR="backups"
TEMP_DIR="/tmp/africanmarket_restore"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Show usage
usage() {
    echo "Usage: $0 [backup-file] [environment]"
    echo ""
    echo "Arguments:"
    echo "  backup-file   - Path to backup file (.sql.gz or .sql)"
    echo "  environment   - Target environment (production, staging, development)"
    echo ""
    echo "Examples:"
    echo "  $0 backups/africanmarket_production_20240116_120000.sql.gz production"
    echo "  $0 backups/latest.sql.gz staging"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}/"*.sql.gz 2>/dev/null | tail -10 || echo "  No backup files found"
}

# Validate arguments
validate_arguments() {
    if [[ -z "$BACKUP_FILE" ]]; then
        error "Backup file not specified"
        usage
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        error "Backup file does not exist: $BACKUP_FILE"
        exit 1
    fi
    
    if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "development" ]]; then
        error "Invalid environment: $ENVIRONMENT"
        usage
        exit 1
    fi
}

# Load environment variables
load_environment() {
    local env_file=".env.${ENVIRONMENT}"
    
    if [[ -f "$env_file" ]]; then
        source "$env_file"
        log "Loaded environment variables from $env_file"
    else
        error "Environment file not found: $env_file"
        exit 1
    fi
}

# Confirm restoration
confirm_restoration() {
    warning "⚠️  DANGER: This will COMPLETELY REPLACE the current database!"
    warning "Environment: $ENVIRONMENT"
    warning "Database: $POSTGRES_DB"
    warning "Backup file: $BACKUP_FILE"
    echo ""
    
    # Show backup file info
    info "Backup file information:"
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        info "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        info "  Date: $(stat -c %y "$BACKUP_FILE")"
        info "  Compressed: Yes"
    else
        info "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        info "  Date: $(stat -c %y "$BACKUP_FILE")"
        info "  Compressed: No"
    fi
    
    echo ""
    read -p "Are you absolutely sure you want to proceed? Type 'yes' to continue: " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log "Restoration cancelled by user"
        exit 0
    fi
}

# Create pre-restoration backup
create_pre_restore_backup() {
    log "Creating pre-restoration backup as safety measure..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local safety_backup="${BACKUP_DIR}/pre_restore_${ENVIRONMENT}_${timestamp}.sql.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    if docker ps | grep -q "${PROJECT_NAME}_postgres"; then
        docker exec "${PROJECT_NAME}_postgres" pg_dump \
            -U "${POSTGRES_USER}" \
            -h localhost \
            -p 5432 \
            --verbose \
            --clean \
            --if-exists \
            "${POSTGRES_DB}" | gzip > "$safety_backup"
        
        log "Safety backup created: $safety_backup"
    else
        warning "Database container not running - skipping safety backup"
    fi
}

# Stop application services
stop_services() {
    log "Stopping application services..."
    
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" stop app || true
    
    # Wait for connections to close
    sleep 5
    
    log "Application services stopped"
}

# Start application services
start_services() {
    log "Starting application services..."
    
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" up -d
    
    # Wait for services to be ready
    log "Waiting for services to initialize..."
    sleep 30
    
    log "Application services started"
}

# Prepare backup file
prepare_backup_file() {
    log "Preparing backup file for restoration..."
    
    mkdir -p "$TEMP_DIR"
    
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log "Extracting compressed backup file..."
        gunzip -c "$BACKUP_FILE" > "${TEMP_DIR}/restore.sql"
        PREPARED_FILE="${TEMP_DIR}/restore.sql"
    else
        PREPARED_FILE="$BACKUP_FILE"
    fi
    
    # Validate SQL file
    if ! head -20 "$PREPARED_FILE" | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to be a valid PostgreSQL dump"
        cleanup_temp_files
        exit 1
    fi
    
    log "Backup file prepared: $PREPARED_FILE"
}

# Terminate active connections
terminate_connections() {
    log "Terminating active database connections..."
    
    docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true
    
    log "Active connections terminated"
}

# Drop and recreate database
recreate_database() {
    log "Recreating database..."
    
    # Drop database
    docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"
    
    # Create database
    docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d postgres \
        -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
    
    log "Database recreated"
}

# Restore database
restore_database() {
    log "Restoring database from backup..."
    
    # Copy SQL file to container
    docker cp "$PREPARED_FILE" "${PROJECT_NAME}_postgres:/tmp/restore.sql"
    
    # Restore database
    docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -f /tmp/restore.sql \
        --set ON_ERROR_STOP=on
    
    if [[ $? -eq 0 ]]; then
        log "Database restoration completed successfully"
    else
        error "Database restoration failed"
        exit 1
    fi
    
    # Clean up SQL file from container
    docker exec "${PROJECT_NAME}_postgres" rm -f /tmp/restore.sql
}

# Run post-restoration tasks
post_restoration_tasks() {
    log "Running post-restoration tasks..."
    
    # Update database schema if needed
    if [[ -f "prisma/schema.prisma" ]]; then
        log "Checking database schema..."
        docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app yarn prisma db push --accept-data-loss || true
    fi
    
    # Clear application caches
    if docker ps | grep -q "${PROJECT_NAME}_redis"; then
        log "Clearing application caches..."
        docker exec "${PROJECT_NAME}_redis" redis-cli FLUSHALL || true
    fi
    
    # Restart application with new data
    log "Restarting application..."
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" restart app
    
    log "Post-restoration tasks completed"
}

# Verify restoration
verify_restoration() {
    log "Verifying database restoration..."
    
    # Basic connectivity test
    docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -c "SELECT version();" > /dev/null
    
    # Check table counts
    local table_count=$(docker exec "${PROJECT_NAME}_postgres" psql \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    info "Number of tables restored: $table_count"
    
    # Check if key tables exist
    local key_tables=("User" "Order" "Product" "Vendor")
    for table in "${key_tables[@]}"; do
        if docker exec "${PROJECT_NAME}_postgres" psql \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '${table}' LIMIT 1;" | grep -q 1; then
            info "✓ Table $table exists"
        else
            warning "✗ Table $table not found"
        fi
    done
    
    # Test application connectivity
    log "Testing application connectivity..."
    sleep 10
    
    if curl -f "http://localhost:3000/api/health" &> /dev/null; then
        log "✓ Application health check passed"
    else
        warning "✗ Application health check failed"
        warning "You may need to manually restart the application"
    fi
}

# Cleanup temporary files
cleanup_temp_files() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
        log "Temporary files cleaned up"
    fi
}

# Send restoration notification
send_notification() {
    local status=$1
    local message="Database restoration $status for $ENVIRONMENT environment"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 $message\"}" \
            "$SLACK_WEBHOOK_URL" || warning "Failed to send Slack notification"
    fi
    
    log "Restoration $status: $message"
}

# Main restoration process
main() {
    log "Starting database restoration for AfricanMarket ($ENVIRONMENT)"
    log "============================================================"
    
    validate_arguments
    load_environment
    confirm_restoration
    
    # Create safety backup
    create_pre_restore_backup
    
    # Stop services
    stop_services
    
    # Prepare restoration
    prepare_backup_file
    terminate_connections
    recreate_database
    
    # Perform restoration
    restore_database
    
    # Start services and verify
    start_services
    post_restoration_tasks
    verify_restoration
    
    # Cleanup
    cleanup_temp_files
    
    # Notify success
    send_notification "completed successfully"
    
    log "============================================================"
    log "Database restoration completed successfully! ✅"
    log "Environment: $ENVIRONMENT"
    log "Restored from: $BACKUP_FILE"
    
    warning "Important reminders:"
    warning "1. Test the application thoroughly"
    warning "2. Check all critical functionality"
    warning "3. Verify data integrity"
    warning "4. Monitor application logs for errors"
}

# Error handling
handle_error() {
    error "Restoration process failed"
    
    # Cleanup
    cleanup_temp_files
    
    # Try to restart services
    warning "Attempting to restart services..."
    start_services || true
    
    # Send failure notification
    send_notification "failed"
    
    exit 1
}

trap handle_error ERR

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"
