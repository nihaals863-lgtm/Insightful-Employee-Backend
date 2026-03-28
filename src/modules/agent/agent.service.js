const prisma = require('../../config/db');

/**
 * Register a new device agent for an employee
 */
const registerAgent = async (employeeId, deviceId, systemInfo) => {
    // Upsert agent: update if exists (linked by employeeId), otherwise create
    return await prisma.agent.upsert({
        where: { employeeId },
        update: {
            deviceId,
            status: 'active',
            systemInfo,
            lastSeen: new Date(),
        },
        create: {
            employeeId,
            deviceId,
            systemInfo,
            status: 'active',
            lastSeen: new Date(),
        },
    });
};

/**
 * Update agent heartbeat
 */
const heartbeat = async (deviceId) => {
    return await prisma.agent.update({
        where: { deviceId },
        data: {
            status: 'active',
            lastSeen: new Date(),
        },
    });
};

/**
 * Check if employee has an active agent
 */
const getAgentStatus = async (employeeId) => {
    const agent = await prisma.agent.findUnique({
        where: { employeeId }
    });

    if (!agent) return { active: false, status: 'missing' };

    // Agent is active if status is 'active' AND lastSeen is within 5 minutes
    const isRecent = new Date() - new Date(agent.lastSeen) < 5 * 60 * 1000;
    const isActive = agent.status === 'active' && isRecent;

    return {
        active: isActive,
        status: isActive ? 'active' : 'inactive',
        lastSeen: agent.lastSeen,
        deviceId: agent.deviceId
    };
};

module.exports = {
    registerAgent,
    heartbeat,
    getAgentStatus,
};
