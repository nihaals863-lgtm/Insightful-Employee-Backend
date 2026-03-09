const express = require('express');
const router = express.Router();
const productivityController = require('./productivity.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/apps', productivityController.getApps);

module.exports = router;
