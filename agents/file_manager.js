#!/usr/bin/env node

const BaseAgent = require('./base_agent');
const fs = require('fs');
const path = require('path');

class FileManagerAgent extends BaseAgent {
  constructor() {
    super('FileManager', 'manager', [
      'file_operations',
      'directory_management',
      'backup_creation',
      'file_monitoring',
      'cleanup_operations'
    ]);
    this.workingDir = path.join(__dirname, '..', 'data');
  }

  async executeTask(task) {
    this.log(`Executing file management task: ${task.name}`);
    
    switch (task.command) {
      case 'create_backup':
        return await this.createBackup(task.params);
      
      case 'cleanup':
        return await this.performCleanup(task.params);
      
      case 'organize_files':
        return await this.organizeFiles(task.params);
      
      case 'monitor_directory':
        return await this.monitorDirectory(task.params);
      
      case 'copy_files':
        return await this.copyFiles(task.params);
      
      default:
        return await this.defaultFileOperation(task);
    }
  }

  async createBackup(params) {
    const { source, destination } = params || {};
    const backupDir = destination || path.join(this.workingDir, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup_${timestamp}`);

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      if (source && fs.existsSync(source)) {
        const files = fs.readdirSync(source);
        fs.mkdirSync(backupPath, { recursive: true });
        
        let copiedCount = 0;
        for (const file of files) {
          const srcPath = path.join(source, file);
          const destPath = path.join(backupPath, file);
          
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            copiedCount++;
          }
        }
        
        this.log(`Backup created: ${backupPath} (${copiedCount} files)`);
        return { success: true, backupPath, filesBackedUp: copiedCount };
      }
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async performCleanup(params) {
    const { directory, pattern = '*.tmp', daysOld = 7 } = params || {};
    const targetDir = directory || this.workingDir;
    
    try {
      const files = fs.readdirSync(targetDir);
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          if (pattern === '*' || file.endsWith(pattern.replace('*', ''))) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            this.log(`Cleaned: ${file}`);
          }
        }
      }

      this.log(`Cleanup completed: ${cleanedCount} files removed`);
      return { success: true, filesRemoved: cleanedCount };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  async organizeFiles(params) {
    const { sourceDir, byType = true } = params || {};
    const targetDir = sourceDir || this.workingDir;
    
    try {
      const files = fs.readdirSync(targetDir);
      const organized = {};

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        
        if (fs.statSync(filePath).isFile()) {
          const ext = path.extname(file).toLowerCase() || '.none';
          const category = ext.substring(1) || 'no_extension';
          
          if (byType) {
            const categoryDir = path.join(targetDir, category);
            if (!fs.existsSync(categoryDir)) {
              fs.mkdirSync(categoryDir, { recursive: true });
            }
            
            fs.renameSync(filePath, path.join(categoryDir, file));
            organized[category] = (organized[category] || 0) + 1;
          }
        }
      }

      this.log(`Files organized by type: ${JSON.stringify(organized)}`);
      return { success: true, organized };
    } catch (error) {
      throw new Error(`Organization failed: ${error.message}`);
    }
  }

  async monitorDirectory(params) {
    const { directory, duration = 5000 } = params || {};
    const targetDir = directory || this.workingDir;
    
    this.log(`Monitoring ${targetDir} for ${duration}ms`);
    
    const initialState = this.getDirectoryState(targetDir);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const finalState = this.getDirectoryState(targetDir);
        const changes = this.compareStates(initialState, finalState);
        
        this.log(`Monitoring complete. Changes detected: ${changes.length}`);
        resolve({ success: true, changes, duration });
      }, duration);
    });
  }

  async copyFiles(params) {
    const { source, destination, pattern = '*' } = params || {};
    
    if (!source || !destination) {
      throw new Error('Source and destination required');
    }

    try {
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
      }

      const files = fs.readdirSync(source);
      let copiedCount = 0;

      for (const file of files) {
        if (pattern === '*' || file.includes(pattern.replace('*', ''))) {
          const srcPath = path.join(source, file);
          const destPath = path.join(destination, file);
          
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            copiedCount++;
          }
        }
      }

      this.log(`Copied ${copiedCount} files from ${source} to ${destination}`);
      return { success: true, filesCopied: copiedCount };
    } catch (error) {
      throw new Error(`Copy operation failed: ${error.message}`);
    }
  }

  getDirectoryState(dir) {
    const state = {};
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const stats = fs.statSync(path.join(dir, file));
        state[file] = {
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      }
    } catch (error) {
      this.log(`Failed to get directory state: ${error.message}`, 'error');
    }
    return state;
  }

  compareStates(initial, final) {
    const changes = [];
    
    for (const file in final) {
      if (!initial[file]) {
        changes.push({ type: 'added', file });
      } else if (initial[file].modified !== final[file].modified) {
        changes.push({ type: 'modified', file });
      }
    }
    
    for (const file in initial) {
      if (!final[file]) {
        changes.push({ type: 'deleted', file });
      }
    }
    
    return changes;
  }

  async defaultFileOperation(task) {
    this.log(`Executing default file operation: ${task.name}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, operation: task.name, agent: this.name };
  }
}

if (require.main === module) {
  const agent = new FileManagerAgent();
  agent.initialize();
  
  console.log('\nFileManager Agent is running. Waiting for tasks...');
  console.log('Type "status" for agent status, "shutdown" to stop\n');

  process.stdin.on('data', (data) => {
    const command = data.toString().trim().toLowerCase();
    
    if (command === 'status') {
      console.log(JSON.stringify(agent.getStatus(), null, 2));
    } else if (command === 'shutdown') {
      agent.shutdown();
    }
  });

  process.on('SIGINT', () => agent.shutdown());
  process.on('SIGTERM', () => agent.shutdown());
}

module.exports = FileManagerAgent;