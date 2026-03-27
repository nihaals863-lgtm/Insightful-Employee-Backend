const express = require('express');
const router = express.Router();
const screenshotsController = require('./screenshots.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// POST /api/screenshots - Create new screenshot
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/', upload.single('image'), screenshotsController.createScreenshot);

// GET /api/screenshots - Get all screenshots (role-based)
router.get('/', screenshotsController.getScreenshots);

// GET /api/screenshots/employee/:employeeId - Get screenshots for specific employee
router.get('/employee/:employeeId', screenshotsController.getEmployeeScreenshots);

// PATCH /api/screenshots/:id/blur - Toggle blur
router.patch('/:id/blur', screenshotsController.toggleBlur);

// Screenshot Settings
const screenshotSettingsRoutes = require('./screenshotSettings.routes');
router.use('/settings', screenshotSettingsRoutes);

module.exports = router;
