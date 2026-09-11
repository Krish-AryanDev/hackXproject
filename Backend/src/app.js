import express from 'express';
import cors from 'cors';
import { sendSuccess } from './utils/response.util.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { connectDB } from './db/db.js';
import env from './config/env.js';
import apiRouter from './modules/index.js';

const app = express();

// =============================================================================
// GLOBAL MIDDLEWARES
// =============================================================================
app.use(
    cors({
        origin: '*', // Can be restricted in production
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Request Logger (Development)
if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}

// =============================================================================
// CORE / HEALTH ROUTES
// =============================================================================

// Root welcome route
app.get('/', (req, res) => {
    return sendSuccess(
        res,
        {
            service: 'Community Logistics Exchange API',
            status: 'online',
            environment: env.NODE_ENV,
            version: '1.0.0',
        },
        'Community Logistics Exchange API is running'
    );
});

// Detailed health check
app.get('/api/health', async (req, res, next) => {
    try {
        const isDbConnected = await connectDB();
        return sendSuccess(
            res,
            {
                database: isDbConnected ? 'connected' : 'unreachable',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            },
            'System health status retrieved'
        );
    } catch (error) {
        next(error);
    }
});

// API Routes
app.use('/api/v1', apiRouter);



// =============================================================================
// 404 & ERROR HANDLING PIPELINE
// =============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
