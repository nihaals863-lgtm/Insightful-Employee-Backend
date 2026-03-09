const screenshotsService = require('./screenshots.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');
const prisma = require('../../config/db');

const screenshotsController = {
    // POST /api/screenshots
    createScreenshot: async (req, res) => {
        try {
            const { employeeId, imageUrl, productivity, capturedAt } = req.body;
            const organizationId = await getOrganizationId(req);

            if (!employeeId || !imageUrl) {
                return errorResponse(res, 'employeeId and imageUrl are required', 400);
            }

            const screenshot = await screenshotsService.createScreenshot({
                employeeId,
                organizationId,
                imageUrl,
                productivity: productivity || 'NEUTRAL',
                capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
            });

            return successResponse(res, screenshot, 'Screenshot captured successfully');
        } catch (error) {
            console.error('Error creating screenshot:', error);
            return errorResponse(res, error.message);
        }
    },

    // GET /api/screenshots
    getScreenshots: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId: userId } = req.user;
            const { employeeId, date, productivity, limit = 50, offset = 0 } = req.query;

            let where = { organizationId };

            // Role-based filtering
            if (role === 'EMPLOYEE') {
                // Employee can only see own screenshots
                where.employeeId = userId;
            } else if (role === 'MANAGER') {
                // Manager can see their team's screenshots
                const manager = await prisma.employee.findFirst({
                    where: { id: userId },
                    include: { team: { include: { employees: true } } }
                });
                if (manager?.team) {
                    const teamEmployeeIds = manager.team.employees.map(e => e.id);
                    where.employeeId = { in: teamEmployeeIds };
                } else {
                    where.employeeId = userId;
                }
            }
            // ADMIN sees all - no extra filter needed

            // Additional query filters
            if (employeeId && role !== 'EMPLOYEE') {
                where.employeeId = employeeId;
            }

            if (productivity) {
                where.productivity = productivity.toUpperCase();
            }

            if (date) {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                where.capturedAt = { gte: start, lte: end };
            }

            const screenshots = await screenshotsService.getScreenshots(where);

            return successResponse(res, screenshots, 'Screenshots fetched successfully');
        } catch (error) {
            console.error('Error fetching screenshots:', error);
            return errorResponse(res, error.message);
        }
    },

    // GET /api/screenshots/employee/:employeeId
    getEmployeeScreenshots: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { date } = req.query;
            const organizationId = await getOrganizationId(req);
            const { role } = req.user;

            let where = { employeeId, organizationId };

            if (date) {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                where.capturedAt = { gte: start, lte: end };
            }

            const screenshots = await screenshotsService.getScreenshots(where);
            return successResponse(res, screenshots, 'Employee screenshots fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // PATCH /api/screenshots/:id/blur
    toggleBlur: async (req, res) => {
        try {
            const { id } = req.params;
            const screenshot = await screenshotsService.toggleBlur(id);

            if (!screenshot) {
                return errorResponse(res, 'Screenshot not found', 404);
            }

            return successResponse(res, screenshot, `Screenshot ${screenshot.blurred ? 'blurred' : 'unblurred'} successfully`);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
};

module.exports = screenshotsController;
