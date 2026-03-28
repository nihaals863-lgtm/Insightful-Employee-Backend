const agentService = require('./agent.service');
const { successResponse, errorResponse } = require('../../utils/response');

const register = async (req, res) => {
    try {
        const { employeeId, deviceId, systemInfo } = req.body;
        if (!employeeId || !deviceId) {
            return errorResponse(res, 'Employee ID and Device ID are required', 400);
        }

        const agent = await agentService.registerAgent(employeeId, deviceId, systemInfo);
        return successResponse(res, agent, 'Agent registered successfully');
    } catch (error) {
        console.error('Agent register error:', error);
        return errorResponse(res, error.message || 'Failed to register agent', 500);
    }
};

const heartbeat = async (req, res) => {
    try {
        const { deviceId } = req.body;
        if (!deviceId) {
            return errorResponse(res, 'Device ID is required', 400);
        }

        await agentService.heartbeat(deviceId);
        return successResponse(res, null, 'Heartbeat received');
    } catch (error) {
        console.error('Agent heartbeat error:', error);
        return errorResponse(res, error.message || 'Heartbeat failed', 500);
    }
};

const getStatus = async (req, res) => {
    try {
        const employeeId = req.params.employeeId || req.user.employeeId;
        const status = await agentService.getAgentStatus(employeeId);
        return successResponse(res, status, 'Agent status retrieved');
    } catch (error) {
        console.error('Get agent status error:', error);
        return errorResponse(res, error.message || 'Failed to get status', 500);
    }
};

module.exports = {
    register,
    heartbeat,
    getStatus,
};
