import env from './src/config/env.js';
import app from './src/app.js';
import { connectDB } from './src/db/db.js';

const startServer = async () => {
    console.log('🚀 Initializing Community Logistics Exchange Backend...');
    
    // Test Supabase connection on startup
    await connectDB();

    const server = app.listen(env.PORT, () => {
        console.log(`🌐 Server running at http://localhost:${env.PORT} in [${env.NODE_ENV}] mode`);
        console.log(`📡 Health endpoint: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful Shutdown
    const shutdown = (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        server.close(() => {
            console.log('✅ HTTP server closed. Process terminated.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
