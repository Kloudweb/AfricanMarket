
// Backup monitoring and validation system for AfricanMarket
// Ensures backup integrity and schedules regular backup operations

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupMonitor {
  constructor() {
    this.config = {
      backupDir: './backups',
      schedules: {
        database: {
          full: '0 2 * * *', // Daily at 2 AM
          incremental: '0 */6 * * *', // Every 6 hours
        },
        files: {
          full: '0 3 * * 0', // Weekly on Sunday at 3 AM
          incremental: '0 4 * * *', // Daily at 4 AM
        },
      },
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
      },
      validation: {
        checkIntegrity: true,
        testRestore: true,
        frequency: '0 5 * * *', // Daily at 5 AM
      },
      alerts: {
        failureThreshold: 2,
        emailEnabled: true,
        slackEnabled: true,
      },
    };
    
    this.backupHistory = new Map();
    this.alerts = [];
  }

  // Initialize backup monitoring
  async initialize() {
    try {
      // Ensure backup directories exist
      await this.createBackupDirectories();
      
      // Load backup history
      await this.loadBackupHistory();
      
      // Schedule backup operations
      this.scheduleBackups();
      
      // Schedule validation checks
      this.scheduleValidation();
      
      console.log('Backup monitoring initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backup monitoring:', error);
      throw error;
    }
  }

  // Create backup directory structure
  async createBackupDirectories() {
    const directories = [
      'database',
      'files',
      'config',
      'logs',
      'validation',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.config.backupDir, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  // Load backup history from file
  async loadBackupHistory() {
    const historyFile = path.join(this.config.backupDir, 'backup-history.json');
    
    try {
      const data = await fs.readFile(historyFile, 'utf8');
      const history = JSON.parse(data);
      
      // Convert array to Map
      history.forEach(entry => {
        this.backupHistory.set(entry.id, entry);
      });
      
      console.log(`Loaded ${this.backupHistory.size} backup history entries`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load backup history:', error);
      }
      // File doesn't exist, start with empty history
    }
  }

  // Save backup history to file
  async saveBackupHistory() {
    const historyFile = path.join(this.config.backupDir, 'backup-history.json');
    const historyArray = Array.from(this.backupHistory.values());
    
    try {
      await fs.writeFile(historyFile, JSON.stringify(historyArray, null, 2));
    } catch (error) {
      console.error('Failed to save backup history:', error);
    }
  }

  // Schedule backup operations
  scheduleBackups() {
    const cron = require('node-cron');
    
    // Schedule database backups
    cron.schedule(this.config.schedules.database.full, () => {
      this.performDatabaseBackup('full');
    });
    
    cron.schedule(this.config.schedules.database.incremental, () => {
      this.performDatabaseBackup('incremental');
    });
    
    // Schedule file backups
    cron.schedule(this.config.schedules.files.full, () => {
      this.performFilesBackup('full');
    });
    
    cron.schedule(this.config.schedules.files.incremental, () => {
      this.performFilesBackup('incremental');
    });
    
    console.log('Backup schedules configured');
  }

  // Schedule validation checks
  scheduleValidation() {
    const cron = require('node-cron');
    
    cron.schedule(this.config.validation.frequency, () => {
      this.validateBackups();
    });
    
    console.log('Backup validation scheduled');
  }

  // Perform database backup
  async performDatabaseBackup(type = 'full') {
    const backupId = this.generateBackupId('database', type);
    const startTime = Date.now();
    
    try {
      console.log(`Starting ${type} database backup: ${backupId}`);
      
      // Execute backup script
      const command = `./scripts/backup.sh ${process.env.NODE_ENV || 'production'} ${type}`;
      const { stdout, stderr } = await execAsync(command);
      
      const duration = Date.now() - startTime;
      const backupFile = await this.findLatestBackupFile('database');
      
      // Record backup details
      const backupEntry = {
        id: backupId,
        type: 'database',
        backupType: type,
        timestamp: new Date().toISOString(),
        duration,
        file: backupFile,
        size: backupFile ? await this.getFileSize(backupFile) : 0,
        status: 'completed',
        logs: {
          stdout: stdout.substring(0, 1000), // Truncate logs
          stderr: stderr.substring(0, 1000),
        },
      };
      
      this.backupHistory.set(backupId, backupEntry);
      await this.saveBackupHistory();
      
      console.log(`Database backup completed: ${backupId} (${duration}ms)`);
      
      // Validate backup if enabled
      if (this.config.validation.checkIntegrity) {
        await this.validateBackup(backupEntry);
      }
      
      // Clean up old backups
      await this.cleanupOldBackups('database');
      
      return backupEntry;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      const backupEntry = {
        id: backupId,
        type: 'database',
        backupType: type,
        timestamp: new Date().toISOString(),
        duration,
        status: 'failed',
        error: error.message,
      };
      
      this.backupHistory.set(backupId, backupEntry);
      await this.saveBackupHistory();
      
      console.error(`Database backup failed: ${backupId}`, error);
      
      // Send alert
      await this.sendBackupAlert('Database backup failed', backupEntry);
      
      throw error;
    }
  }

  // Perform files backup
  async performFilesBackup(type = 'full') {
    const backupId = this.generateBackupId('files', type);
    const startTime = Date.now();
    
    try {
      console.log(`Starting ${type} files backup: ${backupId}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        this.config.backupDir,
        'files',
        `africanmarket_files_${process.env.NODE_ENV}_${type}_${timestamp}.tar.gz`
      );
      
      // Create tar archive of important files
      const filesToBackup = [
        'public/uploads',
        '.next/static',
        'prisma/migrations',
        '.env*',
        'docker-compose*.yml',
        'nginx.conf',
      ];
      
      const tarCommand = `tar -czf ${backupFile} ${filesToBackup.join(' ')} 2>/dev/null || true`;
      await execAsync(tarCommand);
      
      const duration = Date.now() - startTime;
      const size = await this.getFileSize(backupFile);
      
      // Record backup details
      const backupEntry = {
        id: backupId,
        type: 'files',
        backupType: type,
        timestamp: new Date().toISOString(),
        duration,
        file: backupFile,
        size,
        status: 'completed',
      };
      
      this.backupHistory.set(backupId, backupEntry);
      await this.saveBackupHistory();
      
      console.log(`Files backup completed: ${backupId} (${duration}ms, ${this.formatFileSize(size)})`);
      
      // Clean up old backups
      await this.cleanupOldBackups('files');
      
      return backupEntry;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      const backupEntry = {
        id: backupId,
        type: 'files',
        backupType: type,
        timestamp: new Date().toISOString(),
        duration,
        status: 'failed',
        error: error.message,
      };
      
      this.backupHistory.set(backupId, backupEntry);
      await this.saveBackupHistory();
      
      console.error(`Files backup failed: ${backupId}`, error);
      
      // Send alert
      await this.sendBackupAlert('Files backup failed', backupEntry);
      
      throw error;
    }
  }

  // Validate all recent backups
  async validateBackups() {
    console.log('Starting backup validation...');
    
    // Get recent backups for validation
    const recentBackups = Array.from(this.backupHistory.values())
      .filter(backup => {
        const age = Date.now() - new Date(backup.timestamp).getTime();
        return age < 24 * 60 * 60 * 1000; // Last 24 hours
      })
      .filter(backup => backup.status === 'completed');
    
    const validationResults = [];
    
    for (const backup of recentBackups) {
      try {
        const result = await this.validateBackup(backup);
        validationResults.push(result);
      } catch (error) {
        console.error(`Validation failed for backup ${backup.id}:`, error);
        validationResults.push({
          backupId: backup.id,
          status: 'failed',
          error: error.message,
        });
      }
    }
    
    // Generate validation report
    await this.generateValidationReport(validationResults);
    
    console.log(`Backup validation completed: ${validationResults.length} backups checked`);
  }

  // Validate individual backup
  async validateBackup(backup) {
    console.log(`Validating backup: ${backup.id}`);
    
    const validationResult = {
      backupId: backup.id,
      timestamp: new Date().toISOString(),
      tests: [],
      status: 'passed',
    };
    
    try {
      // Test 1: File existence
      if (backup.file) {
        const exists = await this.fileExists(backup.file);
        validationResult.tests.push({
          name: 'file_existence',
          status: exists ? 'passed' : 'failed',
          message: exists ? 'Backup file exists' : 'Backup file not found',
        });
        
        if (!exists) {
          validationResult.status = 'failed';
          return validationResult;
        }
      }
      
      // Test 2: File integrity
      if (backup.type === 'database' && backup.file) {
        const integrityTest = await this.testFileIntegrity(backup.file);
        validationResult.tests.push(integrityTest);
        
        if (integrityTest.status === 'failed') {
          validationResult.status = 'failed';
        }
      }
      
      // Test 3: Size validation
      if (backup.file) {
        const currentSize = await this.getFileSize(backup.file);
        const sizeTest = {
          name: 'size_validation',
          status: currentSize > 0 ? 'passed' : 'failed',
          message: `Backup size: ${this.formatFileSize(currentSize)}`,
          details: { currentSize, originalSize: backup.size },
        };
        
        validationResult.tests.push(sizeTest);
        
        if (currentSize === 0) {
          validationResult.status = 'failed';
        }
      }
      
      // Test 4: Test restore (if enabled and it's a database backup)
      if (this.config.validation.testRestore && 
          backup.type === 'database' && 
          backup.backupType === 'full') {
        const restoreTest = await this.testBackupRestore(backup);
        validationResult.tests.push(restoreTest);
        
        if (restoreTest.status === 'failed') {
          validationResult.status = 'warning'; // Don't fail validation on restore test failure
        }
      }
      
      console.log(`Backup validation ${validationResult.status}: ${backup.id}`);
      
    } catch (error) {
      validationResult.status = 'failed';
      validationResult.error = error.message;
      console.error(`Backup validation error: ${backup.id}`, error);
    }
    
    return validationResult;
  }

  // Test file integrity
  async testFileIntegrity(filePath) {
    try {
      if (filePath.endsWith('.gz')) {
        // Test gzip integrity
        await execAsync(`gzip -t "${filePath}"`);
        return {
          name: 'file_integrity',
          status: 'passed',
          message: 'File integrity check passed',
        };
      } else if (filePath.endsWith('.tar.gz')) {
        // Test tar.gz integrity
        await execAsync(`tar -tzf "${filePath}" >/dev/null`);
        return {
          name: 'file_integrity',
          status: 'passed',
          message: 'Archive integrity check passed',
        };
      } else {
        return {
          name: 'file_integrity',
          status: 'skipped',
          message: 'Integrity test not applicable for file type',
        };
      }
    } catch (error) {
      return {
        name: 'file_integrity',
        status: 'failed',
        message: 'File integrity check failed',
        error: error.message,
      };
    }
  }

  // Test backup restore capability
  async testBackupRestore(backup) {
    try {
      console.log(`Testing restore capability for backup: ${backup.id}`);
      
      // Create temporary test database
      const testDbName = `test_restore_${Date.now()}`;
      
      // Create test database
      await execAsync(`docker exec africanmarket_postgres psql -U postgres -c "CREATE DATABASE ${testDbName};"`);
      
      try {
        // Attempt to restore backup to test database
        const restoreCommand = `zcat "${backup.file}" | docker exec -i africanmarket_postgres psql -U postgres -d ${testDbName} --set ON_ERROR_STOP=on`;
        await execAsync(restoreCommand);
        
        // Test basic queries
        await execAsync(`docker exec africanmarket_postgres psql -U postgres -d ${testDbName} -c "SELECT count(*) FROM information_schema.tables;"`);
        
        return {
          name: 'restore_test',
          status: 'passed',
          message: 'Backup restore test successful',
        };
        
      } finally {
        // Clean up test database
        await execAsync(`docker exec africanmarket_postgres psql -U postgres -c "DROP DATABASE ${testDbName};" || true`);
      }
      
    } catch (error) {
      return {
        name: 'restore_test',
        status: 'failed',
        message: 'Backup restore test failed',
        error: error.message,
      };
    }
  }

  // Clean up old backups based on retention policy
  async cleanupOldBackups(type) {
    try {
      const backupDir = path.join(this.config.backupDir, type);
      const files = await fs.readdir(backupDir);
      
      // Group files by date for retention policy
      const filesByAge = await this.groupFilesByAge(backupDir, files);
      
      const filesToDelete = [];
      
      // Apply retention policy
      const now = new Date();
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime;
        const ageInDays = age / (1000 * 60 * 60 * 24);
        
        // Delete files older than retention period
        if (ageInDays > this.getRetentionDays(file)) {
          filesToDelete.push(filePath);
        }
      }
      
      // Delete old files
      for (const file of filesToDelete) {
        await fs.unlink(file);
        console.log(`Deleted old backup: ${file}`);
      }
      
      if (filesToDelete.length > 0) {
        console.log(`Cleaned up ${filesToDelete.length} old ${type} backups`);
      }
      
    } catch (error) {
      console.error(`Failed to clean up old ${type} backups:`, error);
    }
  }

  // Get retention days for a file based on its type
  getRetentionDays(filename) {
    if (filename.includes('_full_')) {
      return this.config.retention.monthly * 30; // Keep monthly backups longer
    } else if (filename.includes('_incremental_')) {
      return this.config.retention.daily; // Keep incremental backups for shorter period
    }
    return this.config.retention.weekly * 7; // Default to weekly retention
  }

  // Generate backup validation report
  async generateValidationReport(validationResults) {
    const reportPath = path.join(
      this.config.backupDir,
      'validation',
      `validation_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: validationResults.length,
        passed: validationResults.filter(r => r.status === 'passed').length,
        failed: validationResults.filter(r => r.status === 'failed').length,
        warnings: validationResults.filter(r => r.status === 'warning').length,
      },
      results: validationResults,
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Validation report generated: ${reportPath}`);
    
    // Send alerts for failed validations
    const failedValidations = validationResults.filter(r => r.status === 'failed');
    if (failedValidations.length > 0) {
      await this.sendValidationAlert(failedValidations);
    }
  }

  // Send backup alert
  async sendBackupAlert(message, backup) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'backup_failure',
      message,
      backup,
    };
    
    this.alerts.push(alert);
    
    // Send to external alerting systems
    if (this.config.alerts.slackEnabled && process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }
    
    if (this.config.alerts.emailEnabled && process.env.ALERT_EMAIL) {
      await this.sendEmailAlert(alert);
    }
    
    console.log('Backup alert sent:', message);
  }

  // Send validation alert
  async sendValidationAlert(failedValidations) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'validation_failure',
      message: `${failedValidations.length} backup validation(s) failed`,
      failures: failedValidations,
    };
    
    this.alerts.push(alert);
    
    // Send to external alerting systems
    if (this.config.alerts.slackEnabled && process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }
    
    console.log('Validation alert sent');
  }

  // Send Slack alert
  async sendSlackAlert(alert) {
    try {
      const fetch = require('node-fetch');
      
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alert.message}`,
          attachments: [{
            color: 'danger',
            fields: [{
              title: 'Alert Type',
              value: alert.type,
              short: true,
            }, {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true,
            }]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Helper methods
  generateBackupId(type, backupType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_${backupType}_${timestamp}`;
  }

  async findLatestBackupFile(type) {
    try {
      const backupDir = path.join(this.config.backupDir, type);
      const files = await fs.readdir(backupDir);
      const sortedFiles = files
        .filter(f => f.endsWith('.gz'))
        .sort()
        .reverse();
      
      return sortedFiles.length > 0 ? path.join(backupDir, sortedFiles[0]) : null;
    } catch (error) {
      return null;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async groupFilesByAge(directory, files) {
    const grouped = { daily: [], weekly: [], monthly: [] };
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      const age = Date.now() - stats.mtime.getTime();
      const ageInDays = age / (1000 * 60 * 60 * 24);
      
      if (ageInDays <= 7) {
        grouped.daily.push(file);
      } else if (ageInDays <= 30) {
        grouped.weekly.push(file);
      } else {
        grouped.monthly.push(file);
      }
    }
    
    return grouped;
  }

  // Get backup status summary
  getBackupStatus() {
    const recent = Array.from(this.backupHistory.values())
      .filter(backup => {
        const age = Date.now() - new Date(backup.timestamp).getTime();
        return age < 24 * 60 * 60 * 1000; // Last 24 hours
      });
    
    return {
      recentBackups: recent.length,
      successfulBackups: recent.filter(b => b.status === 'completed').length,
      failedBackups: recent.filter(b => b.status === 'failed').length,
      totalSize: recent.reduce((sum, b) => sum + (b.size || 0), 0),
      lastBackup: recent.length > 0 ? recent[recent.length - 1] : null,
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }
}

module.exports = BackupMonitor;
