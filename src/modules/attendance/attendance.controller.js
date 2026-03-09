const attendanceService = require('./attendance.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const attendanceController = {
    clockIn: async (req, res) => {
        try {
            const { id: employeeId } = req.user;
            const organizationId = await getOrganizationId(req);
            const attendance = await attendanceService.clockIn(employeeId, organizationId);
            return successResponse(res, attendance, 'Clocked in successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    clockOut: async (req, res) => {
        try {
            const { id: employeeId } = req.user;
            const attendance = await attendanceService.clockOut(employeeId);
            return successResponse(res, attendance, 'Clocked out successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getTimesheets: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId } = req.user;
            let filters = { ...req.query };

            if (role === 'MANAGER') {
                const { PrismaClient } = require('@prisma/client');
                const prisma = new PrismaClient();
                const manager = await prisma.employee.findUnique({
                    where: { id: employeeId },
                    select: { teamId: true }
                });
                if (manager && manager.teamId) {
                    filters.teamId = manager.teamId;
                }
            } else if (role === 'EMPLOYEE') {
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
            
            let filters = { organizationId };
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
            
            // If employee, they can only see their own shifts
            let employeeId = req.query.employeeId;
            if (role === 'EMPLOYEE') {
                employeeId = currentEmployeeId;
            }

            const shifts = await attendanceService.getShifts(organizationId, employeeId);
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
    }
};

module.exports = attendanceController;
