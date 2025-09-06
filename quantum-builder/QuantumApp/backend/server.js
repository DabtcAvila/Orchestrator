const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const winston = require('winston');

class QuantumServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupDatabase();
        this.setupCache();
        this.setupLogging();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date() });
        });

        // API routes
        this.app.use('/api/users', require('./routes/users'));
        this.app.use('/api/products', require('./routes/products'));
        this.app.use('/api/analytics', require('./routes/analytics'));
        this.app.use('/api/ai', require('./routes/ai'));
    }

    setupDatabase() {
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost/quantumapp'
        });
    }

    setupCache() {
        this.cache = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
    }

    setupLogging() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'combined.log' }),
                new winston.transports.Console({ format: winston.format.simple() })
            ]
        });
    }

    start() {
        this.app.listen(this.port, () => {
            this.logger.info(`Quantum Server running on port ${this.port}`);
        });
    }
}

const server = new QuantumServer();
server.start();

module.exports = server;