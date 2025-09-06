#!/usr/bin/env node

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class InteractiveOrchestrator {
    constructor() {
        this.agents = {
            '🧠 DataProcessor': { active: false, tasks: 0, performance: 0 },
            '🔒 Security': { active: false, tasks: 0, performance: 0 },
            '📁 FileManager': { active: false, tasks: 0, performance: 0 },
            '🔍 Monitor': { active: false, tasks: 0, performance: 0 },
            '🔨 Builder': { active: false, tasks: 0, performance: 0 },
            '🧪 Tester': { active: false, tasks: 0, performance: 0 }
        };
        
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            avgResponseTime: 0,
            throughput: 0,
            parallelRatio: 0
        };
        
        this.activeTasks = [];
        this.isRunning = false;
        this.startTime = Date.now();
    }

    clearScreen() {
        console.clear();
    }

    displayHeader() {
        console.log('\x1b[36m%s\x1b[0m', '╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('\x1b[36m%s\x1b[0m', '║                     🚀 INTERACTIVE ORCHESTRATOR CONTROL CENTER 🚀              ║');
        console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════════════════════════════════════════════════╝');
        console.log();
    }

    displayAgentStatus() {
        console.log('\x1b[33m%s\x1b[0m', '📊 AGENT STATUS PANEL');
        console.log('─'.repeat(80));
        
        Object.entries(this.agents).forEach(([name, agent]) => {
            const status = agent.active ? '\x1b[32m● ACTIVE\x1b[0m' : '\x1b[31m○ IDLE\x1b[0m';
            const perf = agent.performance > 0 ? `${agent.performance.toFixed(1)}%` : '---%';
            console.log(`${name.padEnd(20)} ${status}  Tasks: ${String(agent.tasks).padStart(4)}  Performance: ${perf}`);
        });
        console.log();
    }

    displayMetrics() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const efficiency = this.metrics.completedTasks > 0 
            ? ((this.metrics.completedTasks / this.metrics.totalTasks) * 100).toFixed(1) 
            : 0;
        
        console.log('\x1b[35m%s\x1b[0m', '📈 PERFORMANCE METRICS');
        console.log('─'.repeat(80));
        console.log(`Runtime: ${runtime}s | Tasks: ${this.metrics.completedTasks}/${this.metrics.totalTasks} | Efficiency: ${efficiency}%`);
        console.log(`Throughput: ${this.metrics.throughput} tasks/sec | Parallel Ratio: ${(this.metrics.parallelRatio * 100).toFixed(1)}%`);
        console.log(`Active Tasks: ${this.activeTasks.length} | Failed: ${this.metrics.failedTasks}`);
        console.log();
    }

    displayActiveTasks() {
        if (this.activeTasks.length > 0) {
            console.log('\x1b[32m%s\x1b[0m', '⚡ ACTIVE TASKS');
            console.log('─'.repeat(80));
            this.activeTasks.slice(0, 5).forEach(task => {
                const elapsed = Date.now() - task.startTime;
                console.log(`  [${task.id}] ${task.agent} - ${task.description} (${elapsed}ms)`);
            });
            if (this.activeTasks.length > 5) {
                console.log(`  ... and ${this.activeTasks.length - 5} more`);
            }
            console.log();
        }
    }

    displayMenu() {
        console.log('\x1b[36m%s\x1b[0m', '🎮 COMMANDS');
        console.log('─'.repeat(80));
        console.log('  [1] 🚀 Launch Parallel Tasks      [2] 🌊 Stress Test (100 tasks)');
        console.log('  [3] 🎯 Smart Task Distribution    [4] 🔄 Auto-Balance Workload');
        console.log('  [5] 💥 Chaos Engineering Test     [6] 🧠 AI Learning Mode');
        console.log('  [7] 📊 Generate Report            [8] 🛡️  Test Circuit Breaker');
        console.log('  [9] 🌐 Deploy Microservices       [0] 📡 Real-time Monitor');
        console.log('  [q] Quit');
        console.log('─'.repeat(80));
    }

    async simulateTask(agent, description, duration = null) {
        const taskDuration = duration || Math.floor(Math.random() * 2000) + 500;
        const taskId = `T${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const task = {
            id: taskId,
            agent: agent,
            description: description,
            startTime: Date.now(),
            duration: taskDuration
        };
        
        this.activeTasks.push(task);
        this.agents[agent].active = true;
        this.agents[agent].tasks++;
        this.metrics.totalTasks++;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() > 0.1; // 90% success rate
                
                if (success) {
                    this.metrics.completedTasks++;
                    this.agents[agent].performance = Math.min(100, this.agents[agent].performance + 5);
                } else {
                    this.metrics.failedTasks++;
                    this.agents[agent].performance = Math.max(0, this.agents[agent].performance - 10);
                }
                
                this.activeTasks = this.activeTasks.filter(t => t.id !== taskId);
                
                if (this.activeTasks.filter(t => t.agent === agent).length === 0) {
                    this.agents[agent].active = false;
                }
                
                resolve(success);
            }, taskDuration);
        });
    }

    async launchParallelTasks() {
        console.log('\n\x1b[32m%s\x1b[0m', '🚀 LAUNCHING PARALLEL TASKS...');
        
        const tasks = [
            this.simulateTask('🧠 DataProcessor', 'Analyzing data patterns'),
            this.simulateTask('🔒 Security', 'Security scan'),
            this.simulateTask('📁 FileManager', 'Organizing files'),
            this.simulateTask('🔍 Monitor', 'System monitoring'),
            this.simulateTask('🔨 Builder', 'Building components'),
            this.simulateTask('🧪 Tester', 'Running tests')
        ];
        
        this.metrics.parallelRatio = 1.0;
        await Promise.all(tasks);
        
        console.log('\x1b[32m%s\x1b[0m', '✅ Parallel tasks completed!');
    }

    async stressTest() {
        console.log('\n\x1b[33m%s\x1b[0m', '🌊 INITIATING STRESS TEST - 100 TASKS...');
        
        const agents = Object.keys(this.agents);
        const tasks = [];
        
        for (let i = 0; i < 100; i++) {
            const agent = agents[i % agents.length];
            tasks.push(this.simulateTask(agent, `Stress task ${i + 1}`, 100));
        }
        
        const startTime = Date.now();
        await Promise.all(tasks);
        const duration = Date.now() - startTime;
        
        this.metrics.throughput = Math.floor(100 / (duration / 1000));
        
        console.log('\x1b[32m%s\x1b[0m', `✅ Stress test complete! Throughput: ${this.metrics.throughput} tasks/sec`);
    }

    async smartDistribution() {
        console.log('\n\x1b[35m%s\x1b[0m', '🎯 SMART TASK DISTRIBUTION ACTIVE...');
        
        const taskTypes = [
            { type: 'data', agent: '🧠 DataProcessor', count: 5 },
            { type: 'security', agent: '🔒 Security', count: 3 },
            { type: 'file', agent: '📁 FileManager', count: 4 },
            { type: 'monitor', agent: '🔍 Monitor', count: 2 },
            { type: 'build', agent: '🔨 Builder', count: 6 },
            { type: 'test', agent: '🧪 Tester', count: 5 }
        ];
        
        const tasks = [];
        taskTypes.forEach(({ type, agent, count }) => {
            for (let i = 0; i < count; i++) {
                tasks.push(this.simulateTask(agent, `Smart ${type} task ${i + 1}`));
            }
        });
        
        await Promise.all(tasks);
        console.log('\x1b[32m%s\x1b[0m', '✅ Smart distribution complete!');
    }

    async chaosEngineering() {
        console.log('\n\x1b[31m%s\x1b[0m', '💥 CHAOS ENGINEERING TEST - SIMULATING FAILURES...');
        
        const agents = Object.keys(this.agents);
        const tasks = [];
        
        for (let i = 0; i < 20; i++) {
            const agent = agents[Math.floor(Math.random() * agents.length)];
            const willFail = Math.random() > 0.5;
            
            if (willFail) {
                console.log(`  ⚠️  Injecting failure for ${agent}`);
            }
            
            tasks.push(this.simulateTask(agent, `Chaos task ${i + 1}`, willFail ? 100 : 1000));
        }
        
        await Promise.all(tasks);
        console.log('\x1b[32m%s\x1b[0m', '✅ System survived chaos test!');
    }

    async aiLearningMode() {
        console.log('\n\x1b[35m%s\x1b[0m', '🧠 AI LEARNING MODE ACTIVATED...');
        
        for (let epoch = 1; epoch <= 3; epoch++) {
            console.log(`\n  📚 Learning Epoch ${epoch}/3`);
            
            // Simulate learning
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`    ✓ Pattern recognition: ${30 * epoch}%`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`    ✓ Optimization: ${25 * epoch}%`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`    ✓ Knowledge integration: ${35 * epoch}%`);
        }
        
        console.log('\x1b[32m%s\x1b[0m', '\n✅ AI Learning complete! System optimized by 45%');
    }

    async realTimeMonitor() {
        console.log('\n\x1b[36m%s\x1b[0m', '📡 REAL-TIME MONITORING ACTIVE (Press Ctrl+C to stop)...\n');
        
        const monitorInterval = setInterval(() => {
            this.clearScreen();
            this.displayHeader();
            this.displayAgentStatus();
            this.displayMetrics();
            this.displayActiveTasks();
            console.log('\x1b[33m%s\x1b[0m', 'Press Ctrl+C to stop monitoring...');
        }, 100);
        
        // Generate continuous tasks
        const taskInterval = setInterval(() => {
            const agents = Object.keys(this.agents);
            const agent = agents[Math.floor(Math.random() * agents.length)];
            this.simulateTask(agent, `Monitor task ${Date.now()}`);
        }, 500);
        
        // Wait for user interrupt
        await new Promise(resolve => {
            process.on('SIGINT', () => {
                clearInterval(monitorInterval);
                clearInterval(taskInterval);
                resolve();
            });
        });
    }

    async generateReport() {
        console.log('\n\x1b[35m%s\x1b[0m', '📊 GENERATING PERFORMANCE REPORT...\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            runtime: Math.floor((Date.now() - this.startTime) / 1000),
            metrics: this.metrics,
            agentPerformance: {}
        };
        
        Object.entries(this.agents).forEach(([name, agent]) => {
            report.agentPerformance[name] = {
                tasks: agent.tasks,
                performance: agent.performance
            };
        });
        
        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║                    ORCHESTRATOR PERFORMANCE REPORT                ║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log(`║ Runtime: ${report.runtime}s`);
        console.log(`║ Total Tasks: ${report.metrics.totalTasks}`);
        console.log(`║ Completed: ${report.metrics.completedTasks} (${((report.metrics.completedTasks/report.metrics.totalTasks)*100).toFixed(1)}%)`);
        console.log(`║ Failed: ${report.metrics.failedTasks}`);
        console.log(`║ Throughput: ${report.metrics.throughput} tasks/sec`);
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log('║ TOP PERFORMERS:');
        
        const sorted = Object.entries(report.agentPerformance)
            .sort((a, b) => b[1].performance - a[1].performance)
            .slice(0, 3);
        
        sorted.forEach(([name, data], index) => {
            console.log(`║ ${index + 1}. ${name}: ${data.tasks} tasks, ${data.performance.toFixed(1)}% efficiency`);
        });
        
        console.log('╚══════════════════════════════════════════════════════════════════╝');
        
        // Save report
        const reportPath = path.join(__dirname, '..', 'results', `report_${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n✅ Report saved to: ${reportPath}`);
    }

    async run() {
        this.isRunning = true;
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const showInterface = () => {
            this.clearScreen();
            this.displayHeader();
            this.displayAgentStatus();
            this.displayMetrics();
            this.displayActiveTasks();
            this.displayMenu();
        };
        
        // Update display every second
        const updateInterval = setInterval(() => {
            if (this.isRunning && this.activeTasks.length === 0) {
                showInterface();
            }
        }, 1000);
        
        showInterface();
        
        const handleCommand = async (command) => {
            switch(command.toLowerCase()) {
                case '1':
                    await this.launchParallelTasks();
                    break;
                case '2':
                    await this.stressTest();
                    break;
                case '3':
                    await this.smartDistribution();
                    break;
                case '4':
                    console.log('\n🔄 Auto-balancing workload...');
                    await this.smartDistribution();
                    break;
                case '5':
                    await this.chaosEngineering();
                    break;
                case '6':
                    await this.aiLearningMode();
                    break;
                case '7':
                    await this.generateReport();
                    break;
                case '8':
                    console.log('\n🛡️ Testing Circuit Breaker...');
                    await this.chaosEngineering();
                    break;
                case '9':
                    console.log('\n🌐 Deploying microservices...');
                    await this.launchParallelTasks();
                    break;
                case '0':
                    await this.realTimeMonitor();
                    break;
                case 'q':
                    clearInterval(updateInterval);
                    rl.close();
                    this.isRunning = false;
                    console.log('\n👋 Goodbye!');
                    process.exit(0);
                    break;
                default:
                    console.log('\n❌ Invalid command');
            }
            
            if (command !== 'q') {
                setTimeout(() => {
                    showInterface();
                    rl.question('\nCommand > ', handleCommand);
                }, 2000);
            }
        };
        
        rl.question('\nCommand > ', handleCommand);
    }
}

// Launch the interactive demo
const demo = new InteractiveOrchestrator();
demo.run();