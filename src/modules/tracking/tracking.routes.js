const express = require('express');
const router = express.Router();
const trackingController = require('./tracking.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// All tracking routes are protected and restricted to ADMIN/MANAGER
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'MANAGER']));

// Profiles
router.get('/profiles', trackingController.getProfiles);
router.post('/profiles', trackingController.createProfile);
router.put('/profiles/:id', trackingController.updateProfile);
router.delete('/profiles/:id', trackingController.deleteProfile);

// Advanced Settings
router.get('/advanced', trackingController.getAdvancedSettings);
router.put('/advanced', trackingController.updateAdvancedSettings);

module.exports = router;
