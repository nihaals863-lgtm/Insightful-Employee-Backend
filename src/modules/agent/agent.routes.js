const express = require('express');
const router = express.Router();
const agentController = require('./agent.controller');
const authenticate = require('../../middlewares/auth');

// Public registration (initially) or authenticated
router.post('/register', agentController.register);
router.post('/heartbeat', agentController.heartbeat);

// Authenticated status check
router.get('/status', authenticate, agentController.getStatus);
router.get('/status/:employeeId', authenticate, agentController.getStatus);

module.exports = router;
