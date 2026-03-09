const app = require('./app');
const { PORT } = require('./config/env');
const logger = require('./utils/logger');
const activitySimulator = require('./services/activitySimulator');
const { startSimulator: startScreenshotSimulator } = require('./modules/screenshots/screenshotSimulator');
const { startAppUsageSimulator } = require('./services/appUsageSimulator');
const { initSocketServer } = require('./socket/server');

const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    // Start simulation engines
    activitySimulator.start();
    startScreenshotSimulator();
    startAppUsageSimulator();
});

// Initialize Socket.IO
initSocketServer(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection! Shutting down...', err.message, err.stack);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception! Shutting down...', err.message, err.stack);
    process.exit(1);
});
