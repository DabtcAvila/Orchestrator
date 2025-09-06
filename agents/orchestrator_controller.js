#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class OrchestratorController {
  constructor() {
    this.agents = {};
    this.taskQueueFile = path.join(__dirname, 'task_queue.json');
    this.configFile = path.join(__dirname, '..', 'config', 'orchestrator.json');
    this.modelConfigFile = path.join(__dirname, '..', 'config', 'models.json');
    this.logFile = path.join(__dirname, '..', 'logs', 'orchestrator_controller.log');
    this.taskIdCounter = 1;
    this.modelConfig = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [CONTROLLER] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Log write error:', error.message);
    }
  }

  initialize() {
    this.log('Orchestrator Controller initializing...');
    this.loadConfig();
    this.loadModelConfig();
    this.setupAgents();
    this.log('Controller ready - Agents can be launched via terminal');
  }

  loadConfig() {
    try {
      this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      this.log(`Configuration loaded: ${this.config.name} v${this.config.version}`);
    } catch (error) {
      this.log(`Failed to load config: ${error.message}`, 'error');
    }
  }

  loadModelConfig() {
    try {
      this.modelConfig = JSON.parse(fs.readFileSync(this.modelConfigFile, 'utf8'));
      this.log(`Model configuration loaded:`);
      this.log(`  Orchestrator: ${this.modelConfig.models.orchestrator.name} (${this.modelConfig.models.orchestrator.model})`);
      this.log(`  Agents: ${this.modelConfig.models.agents.name} (${this.modelConfig.models.agents.model})`);
    } catch (error) {
      this.log(`Failed to load model config: ${error.message}`, 'error');
      this.modelConfig = {
        models: {
          orchestrator: { model: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1' },
          agents: { model: 'claude-sonnet-4-20241022', name: 'Claude Sonnet 4' }
        }
      };
      this.log('Using default model configuration', 'warning');
    }
  }

  setupAgents() {
    this.agentDefinitions = {
      data_processor: {
        script: 'data_processor.js',
        capabilities: ['json_parsing', 'data_transformation', 'report_generation'],
        model: this.modelConfig?.models?.agents?.model || 'claude-sonnet-4-20241022'
      },
      file_manager: {
        script: 'file_manager.js',
        capabilities: ['file_operations', 'backup_creation', 'cleanup_operations'],
        model: this.modelConfig?.models?.agents?.model || 'claude-sonnet-4-20241022'
      },
      monitor: {
        script: 'monitor_agent.js',
        capabilities: ['system_monitoring', 'alert_generation', 'health_checks'],
        model: this.modelConfig?.models?.agents?.model || 'claude-sonnet-4-20241022'
      },
      research: {
        script: 'research_agent.js',
        capabilities: ['deep_research', 'web_search', 'pattern_extraction', 'knowledge_synthesis'],
        model: this.modelConfig?.models?.agents?.model || 'claude-sonnet-4-20241022'
      }
    };

    this.log(`Available agents: ${Object.keys(this.agentDefinitions).join(', ')}`);
    this.log(`All agents configured to use: ${this.modelConfig?.models?.agents?.name || 'Claude Sonnet 4'}`);
  }

  createTask(name, description, command, params = {}, priority = 'normal', targetAgent = null) {
    const task = {
      id: `task_${this.taskIdCounter++}`,
      name,
      description,
      command,
      params,
      priority,
      targetAgent,
      status: 'pending',
      created: new Date().toISOString()
    };

    this.addToQueue(task);
    this.log(`Task created: ${task.id} - ${name} (Priority: ${priority})`);
    
    if (targetAgent) {
      this.assignTask(task, targetAgent);
    } else {
      this.autoAssignTask(task);
    }

    return task;
  }

  addToQueue(task) {
    try {
      const queue = this.loadQueue();
      queue.queue.push(task);
      queue.stats.total_received++;
      this.saveQueue(queue);
    } catch (error) {
      this.log(`Failed to add task to queue: ${error.message}`, 'error');
    }
  }

  loadQueue() {
    try {
      if (fs.existsSync(this.taskQueueFile)) {
        return JSON.parse(fs.readFileSync(this.taskQueueFile, 'utf8'));
      }
    } catch (error) {
      this.log(`Failed to load queue: ${error.message}`, 'error');
    }
    
    return {
      queue: [],
      assignments: {},
      completed: [],
      stats: { total_received: 0, total_assigned: 0, total_completed: 0 }
    };
  }

  saveQueue(queue) {
    try {
      fs.writeFileSync(this.taskQueueFile, JSON.stringify(queue, null, 2));
    } catch (error) {
      this.log(`Failed to save queue: ${error.message}`, 'error');
    }
  }

  autoAssignTask(task) {
    let bestAgent = null;

    if (task.command) {
      if (task.command.includes('file') || task.command.includes('backup')) {
        bestAgent = 'file_manager';
      } else if (task.command.includes('monitor') || task.command.includes('health')) {
        bestAgent = 'monitor';
      } else if (task.command.includes('data') || task.command.includes('process')) {
        bestAgent = 'data_processor';
      }
    }

    if (bestAgent) {
      this.assignTask(task, bestAgent);
    } else {
      this.log(`No suitable agent found for task ${task.id}, keeping in queue`, 'warning');
    }
  }

  assignTask(task, agentType) {
    const queue = this.loadQueue();
    
    if (!queue.assignments[agentType]) {
      queue.assignments[agentType] = [];
    }
    
    queue.assignments[agentType].push(task);
    queue.stats.total_assigned++;
    
    const index = queue.queue.findIndex(t => t.id === task.id);
    if (index > -1) {
      queue.queue.splice(index, 1);
    }
    
    this.saveQueue(queue);
    this.log(`Task ${task.id} assigned to ${agentType}`);
    
    this.notifyAgent(agentType, task);
  }

  notifyAgent(agentType, task) {
    const agentTaskFile = path.join(__dirname, '..', 'data', `${agentType}_tasks.json`);
    
    try {
      let tasks = [];
      if (fs.existsSync(agentTaskFile)) {
        tasks = JSON.parse(fs.readFileSync(agentTaskFile, 'utf8'));
      }
      
      tasks.push({
        ...task,
        assignedAt: new Date().toISOString(),
        status: 'pending',
        modelConfig: {
          model: this.agentDefinitions[agentType]?.model,
          name: this.modelConfig?.models?.agents?.name
        }
      });
      
      fs.writeFileSync(agentTaskFile, JSON.stringify(tasks, null, 2));
      this.log(`Task ${task.id} written to ${agentType} task file`);
    } catch (error) {
      this.log(`Failed to notify agent ${agentType}: ${error.message}`, 'error');
    }
  }

  getQueueStatus() {
    const queue = this.loadQueue();
    return {
      pending: queue.queue.length,
      assignments: Object.keys(queue.assignments).map(agent => ({
        agent,
        tasks: queue.assignments[agent].length
      })),
      completed: queue.completed.length,
      stats: queue.stats
    };
  }

  launchAgent(agentType) {
    if (!this.agentDefinitions[agentType]) {
      this.log(`Unknown agent type: ${agentType}`, 'error');
      return false;
    }

    const scriptPath = path.join(__dirname, this.agentDefinitions[agentType].script);
    this.log(`Launch command for ${agentType}: node ${scriptPath}`);
    
    console.log(`\nTo launch ${agentType} agent, run in a new terminal:`);
    console.log(`cd "${path.dirname(scriptPath)}" && node ${path.basename(scriptPath)}\n`);
    
    return true;
  }

  createExampleTasks() {
    this.createTask(
      'System Health Check',
      'Check overall system health',
      'check_health',
      {},
      'high',
      'monitor'
    );

    this.createTask(
      'Backup Logs',
      'Create backup of log files',
      'create_backup',
      { source: path.join(__dirname, '..', 'logs') },
      'normal',
      'file_manager'
    );

    this.createTask(
      'Process Reports',
      'Generate system report',
      'generate_report',
      { type: 'comprehensive' },
      'normal',
      'data_processor'
    );

    this.log('Example tasks created and assigned');
  }
}

if (require.main === module) {
  const controller = new OrchestratorController();
  controller.initialize();
  
  console.log('\n=== ORCHESTRATOR CONTROLLER ===');
  console.log('Commands:');
  console.log('  status    - Show queue status');
  console.log('  create    - Create example tasks');
  console.log('  launch    - Show agent launch commands');
  console.log('  quit      - Exit controller\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'controller> '
  });

  rl.prompt();

  rl.on('line', (line) => {
    const command = line.trim().toLowerCase();
    
    switch (command) {
      case 'status':
        console.log(JSON.stringify(controller.getQueueStatus(), null, 2));
        break;
        
      case 'create':
        controller.createExampleTasks();
        console.log('Example tasks created');
        break;
        
      case 'launch':
        console.log('\nAgent launch commands:');
        Object.keys(controller.agentDefinitions).forEach(agent => {
          controller.launchAgent(agent);
        });
        break;
        
      case 'quit':
      case 'exit':
        process.exit(0);
        
      default:
        console.log('Unknown command. Available: status, create, launch, quit');
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nController shutting down');
    process.exit(0);
  });
}

module.exports = OrchestratorController;