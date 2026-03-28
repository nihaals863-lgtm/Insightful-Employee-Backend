const attendanceService = require('./attendance.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const attendanceController = {
    clockIn: async (req, res) => {
        try {
            // Fix: Extract employeeId directly from token payload instead of aliasing user.id
            const { employeeId } = req.user;
            if (!employeeId) throw new Error('User is not linked to an employee profile');
            
            const organizationId = await getOrganizationId(req);
            const attendance = await attendanceService.clockIn(employeeId, organizationId);
            return successResponse(res, attendance, 'Clocked in successfully');
        } catch (error) {
            const status = error.message.includes('Already clocked in') ? 400 : 500;
            return errorResponse(res, error.message, status);
        }
    },

    clockOut: async (req, res) => {
        try {
            const { employeeId } = req.user;
            if (!employeeId) throw new Error('User is not linked to an employee profile');
            
            const attendance = await attendanceService.clockOut(employeeId);
            return successResponse(res, attendance, 'Clocked out successfully');
        } catch (error) {
            const status = error.message.includes('No active clock-in') ? 400 : 500;
            return errorResponse(res, error.message, status);
        }
    },

    getTimesheets: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId } = req.user;
            let filters = { ...req.query };

            if (role === 'EMPLOYEE') {
                filters.employeeId = employeeId;
            }

            const timesheets = await attendanceService.getTimesheets(organizationId, filters);
            return successResponse(res, timesheets, 'Timesheets fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    addManualTime: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const data = { ...req.body, organizationId };
            const manualTime = await attendanceService.addManualTime(data);
            return successResponse(res, manualTime, 'Manual time added successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getManualTimes: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId } = req.user;
            
            let filters = { ...req.query, organizationId };
            if (role === 'EMPLOYEE') {
                filters.employeeId = employeeId;
            }

            const manualTimes = await attendanceService.getManualTimes(filters);
            return successResponse(res, manualTimes, 'Manual times fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getShifts: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId: currentEmployeeId } = req.user;

            const filters = { ...req.query };
            if (role === 'EMPLOYEE') {
                filters.employeeId = currentEmployeeId;
            }

            const shifts = await attendanceService.getShifts(organizationId, filters);
            return successResponse(res, shifts, 'Shifts fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    createShift: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const data = { ...req.body, organizationId };
            const shift = await attendanceService.createShift(data);
            return successResponse(res, shift, 'Shift scheduled successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    createTimeOff: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const data = { ...req.body, organizationId };
            const timeOff = await attendanceService.createTimeOff(data);
            return successResponse(res, timeOff, 'Time off added successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getTimeOffs: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId: currentEmployeeId } = req.user;

            const filters = { ...req.query };
            if (role === 'EMPLOYEE') {
                filters.employeeId = currentEmployeeId;
            }

            const timeOffs = await attendanceService.getTimeOffs(organizationId, filters);
            return successResponse(res, timeOffs, 'Time offs fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
};

module.exports = attendanceController;
