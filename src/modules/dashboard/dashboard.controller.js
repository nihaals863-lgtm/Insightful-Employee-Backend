const dashboardService = require('./dashboard.service');

const getAdminDashboard = async (req, res) => {
  try {
    const { organizationId } = req.user;
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const data = await dashboardService.getAdminDashboard(organizationId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getManagerDashboard = async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Manager access required' });
    }

    // Need to get the manager's teamId
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { teamId: true }
    });

    if (!employee || !employee.teamId) {
      return res.status(404).json({ message: 'Manager team not found' });
    }

    const data = await dashboardService.getManagerDashboard(organizationId, employee.teamId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeDashboard = async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const data = await dashboardService.getEmployeeDashboard(organizationId, employeeId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};
