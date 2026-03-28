const screenshotsService = require('./screenshots.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');
const prisma = require('../../config/db');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const screenshotsController = {
    // POST /api/screenshots
    createScreenshot: async (req, res) => {
        try {
            const { employeeId, productivity, capturedAt } = req.body;
            let { imageUrl } = req.body; // Falback if they still send URL directly
            const organizationId = await getOrganizationId(req);

            if (!employeeId) {
                return errorResponse(res, 'employeeId is required', 400);
            }

            if (!imageUrl && !req.file) {
                 return errorResponse(res, 'imageUrl or image file is required', 400);
            }

            // If an image file was uploaded, process it
            if (req.file) {
                // Compress image and save to local disk
                console.log('Received file upload, processing...');
                const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
                const uploadDir = path.join(__dirname, '../../../public/uploads/screenshots');
                
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filepath = path.join(uploadDir, filename);
                const shouldBlur = req.body.blurred === 'true';

                let imageProcessor = sharp(req.file.buffer);
                
                if (shouldBlur) {
                    imageProcessor = imageProcessor.blur(15); // Consistent blur level
                }

                await imageProcessor
                    .webp({ quality: 80 })
                    .toFile(filepath);

                imageUrl = `/uploads/screenshots/${filename}`;
            }

            const screenshot = await screenshotsService.createScreenshot({
                employeeId,
                organizationId,
                imageUrl,
                productivity: productivity || 'NEUTRAL',
                blurred: req.body.blurred === 'true',
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
                // Employee can only see own screenshots (and only non-soft-deleted ones)
                where.employeeId = userId;
                where.deletedByEmployee = false;
            } else if (role === 'MANAGER') {
                // Manager can see all screenshots in organization
                where.organizationId = organizationId;
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

            const parsedLimit = parseInt(limit, 10) || 50;
            const parsedOffset = parseInt(offset, 10) || 0;

            const screenshots = await screenshotsService.getScreenshots(where, parsedLimit, parsedOffset);

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
            const { date, limit = 50, offset = 0 } = req.query;
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

            const parsedLimit = parseInt(limit, 10) || 50;
            const parsedOffset = parseInt(offset, 10) || 0;

            const screenshots = await screenshotsService.getScreenshots(where, parsedLimit, parsedOffset);
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
    },

    // DELETE /api/screenshots/:id
    deleteScreenshot: async (req, res) => {
        try {
            const { id } = req.params;
            const { role, employeeId: userId } = req.user;

            // Find screenshot first
            const screenshot = await screenshotsService.getScreenshotById(id);

            if (!screenshot) {
                return errorResponse(res, 'Screenshot not found', 404);
            }

            if (role === 'EMPLOYEE') {
                // Employee can only soft-delete their OWN screenshots
                if (screenshot.employeeId !== userId) {
                    return errorResponse(res, 'Forbidden: You can only delete your own screenshots', 403);
                }
                await screenshotsService.softDeleteForEmployee(id);
                return successResponse(res, null, 'Screenshot hidden from your view');
            }

            // ADMIN or MANAGER: hard-delete permanently from database
            if (role === 'ADMIN' || role === 'MANAGER') {
                await screenshotsService.deleteScreenshot(id);
                return successResponse(res, null, 'Screenshot permanently deleted');
            }

            return errorResponse(res, 'Forbidden', 403);
        } catch (error) {
            console.error('Error deleting screenshot:', error);
            return errorResponse(res, error.message);
        }
    }
};

module.exports = screenshotsController;
