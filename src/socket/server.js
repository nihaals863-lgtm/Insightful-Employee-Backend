const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// In-memory cache for live employee sessions
// Map: employeeId -> { socketId, organizationId, status, lastActivity }
const liveSessions = new Map();

let ioInstance;

const initSocketServer = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST']
        }
    });
    ioInstance = io;

    // Middleware for JWT Authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Invalid token'));
            }
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const { id: userId, employeeId, organizationId, role } = socket.user;
        
        logger.info(`Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

        // Handle Employee Connection
        if (employeeId) {
            liveSessions.set(employeeId, {
                socketId: socket.id,
                organizationId,
                status: 'ONLINE',
                lastActivity: new Date()
            });

            // Broadcast status update to admins/managers in the same org
            io.to(`org_${organizationId}`).emit('employee:status', {
                employeeId,
                status: 'ONLINE'
            });
        }

        // Join organization-specific room for broadcasting updates
        if (organizationId) {
            socket.join(`org_${organizationId}`);
        }

        // Handle Live Activity
        socket.on('employee:activity', async (data) => {
            if (!employeeId) return;

            const { activeApp, activeWindow, keystrokes, mouseClicks, idleTime } = data;

            // Update session cache
            const session = liveSessions.get(employeeId);
            if (session) {
                session.lastActivity = new Date();
                
                // Status logic: 
                // idleTime is in seconds from host. 
                // Logic per PRD: lastActivity < 1m -> ONLINE, < 5m -> IDLE, > 5m -> OFFLINE
                // However, since we receive real-time events, we can use idleTime directly if available.
                const newStatus = idleTime > 300 ? 'OFFLINE' : (idleTime > 60 ? 'IDLE' : 'ONLINE');
                
                if (session.status !== newStatus) {
                    session.status = newStatus;
                    io.to(`org_${organizationId}`).emit('employee:status', {
                        employeeId,
                        status: newStatus
                    });
                }
            }

            try {
                // Store in DB
                await prisma.liveActivity.create({
                    data: {
                        employeeId,
                        organizationId,
                        activeApp: activeApp || 'Unknown',
                        activeWindow: activeWindow || 'Unknown',
                        keystrokes: keystrokes || 0,
                        mouseClicks: mouseClicks || 0,
                        idleTime: idleTime || 0
                    }
                });

                // Broadcast to admin dashboard
                io.to(`org_${organizationId}`).emit('activity:update', {
                    employeeId,
                    ...data,
                    timestamp: new Date()
                });
            } catch (err) {
                logger.error('Error saving live activity:', err);
            }
        });

        // Handle Screenshots
        socket.on('employee:screenshot', (data) => {
            if (!organizationId) return;
            // Broadcast event to listeners (ScreenshotMonitoring page)
            io.to(`org_${organizationId}`).emit('screenshot:new', data);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
            
            if (employeeId) {
                const session = liveSessions.get(employeeId);
                if (session && session.socketId === socket.id) {
                    liveSessions.delete(employeeId);
                    
                    io.to(`org_${organizationId}`).emit('employee:status', {
                        employeeId,
                        status: 'OFFLINE'
                    });
                }
            }
        });
    });

    return io;
};

const getLiveSessions = () => liveSessions;
const getIO = () => ioInstance;

module.exports = { initSocketServer, getLiveSessions, getIO };
