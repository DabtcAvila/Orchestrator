#!/usr/bin/env node

const BaseAgent = require('./base_agent');
const fs = require('fs');
const path = require('path');

class DataProcessorAgent extends BaseAgent {
  constructor() {
    super('DataProcessor', 'processor', [
      'json_parsing',
      'data_transformation',
      'file_analysis',
      'data_aggregation',
      'report_generation'
    ]);
    this.processedData = [];
  }

  async executeTask(task) {
    this.log(`Processing data task: ${task.name}`);
    
    switch (task.command) {
      case 'analyze_file':
        return await this.analyzeFile(task.params);
      
      case 'transform_data':
        return await this.transformData(task.params);
      
      case 'generate_report':
        return await this.generateReport(task.params);
      
      case 'aggregate_data':
        return await this.aggregateData(task.params);
      
      default:
        return await this.defaultProcess(task);
    }
  }

  async analyzeFile(params) {
    const { filepath } = params || {};
    if (!filepath) {
      throw new Error('No filepath provided');
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const stats = fs.statSync(filepath);
      
      const analysis = {
        filepath,
        size: stats.size,
        lines: content.split('\n').length,
        words: content.split(/\s+/).length,
        characters: content.length,
        created: stats.birthtime,
        modified: stats.mtime
      };

      this.log(`File analyzed: ${filepath} (${analysis.lines} lines, ${analysis.size} bytes)`);
      return { success: true, analysis };
    } catch (error) {
      throw new Error(`File analysis failed: ${error.message}`);
    }
  }

  async transformData(params) {
    const { input, transformation } = params || {};
    
    const result = {
      original: input,
      transformed: null,
      timestamp: new Date().toISOString()
    };

    switch (transformation) {
      case 'uppercase':
        result.transformed = JSON.stringify(input).toUpperCase();
        break;
      case 'reverse':
        result.transformed = JSON.stringify(input).split('').reverse().join('');
        break;
      case 'sort':
        if (Array.isArray(input)) {
          result.transformed = input.sort();
        }
        break;
      default:
        result.transformed = input;
    }

    this.processedData.push(result);
    this.log(`Data transformed using ${transformation} method`);
    return { success: true, result };
  }

  async generateReport(params) {
    const { type = 'summary' } = params || {};
    
    const report = {
      agent: this.name,
      type,
      generated: new Date().toISOString(),
      tasksCompleted: this.tasksCompleted,
      dataProcessed: this.processedData.length,
      status: this.getStatus()
    };

    const reportPath = path.join(__dirname, '..', 'data', `report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report generated: ${reportPath}`);
    return { success: true, reportPath, report };
  }

  async aggregateData(params) {
    const { files = [] } = params || {};
    const aggregated = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        aggregated.push({
          file,
          content: JSON.parse(content)
        });
      } catch (error) {
        this.log(`Failed to aggregate ${file}: ${error.message}`, 'warning');
      }
    }

    this.log(`Aggregated data from ${aggregated.length} files`);
    return { success: true, aggregated, count: aggregated.length };
  }

  async defaultProcess(task) {
    this.log(`Executing default processing for: ${task.name}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = {
      task: task.name,
      processed: true,
      timestamp: new Date().toISOString(),
      processor: this.name
    };
    
    this.processedData.push(result);
    return { success: true, result };
  }
}

if (require.main === module) {
  const agent = new DataProcessorAgent();
  agent.initialize();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nDataProcessor Agent is running. Waiting for tasks...');
  console.log('Commands: status, shutdown\n');

  rl.on('line', (input) => {
    const command = input.trim().toLowerCase();
    
    if (command === 'status') {
      console.log(JSON.stringify(agent.getStatus(), null, 2));
    } else if (command === 'shutdown') {
      agent.shutdown();
    }
  });

  process.on('SIGINT', () => agent.shutdown());
  process.on('SIGTERM', () => agent.shutdown());
}

module.exports = DataProcessorAgent;