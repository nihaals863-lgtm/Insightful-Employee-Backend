const payrollService = require('./payroll.service');
const { getOrganizationId } = require('../../utils/orgId');
const { successResponse, errorResponse } = require('../../utils/response');

const getPayrollSummary = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const summary = await payrollService.getPayrollSummary(organizationId);
        return successResponse(res, summary, 'Payroll summary retrieved successfully');
    } catch (error) {
        console.error('Error fetching payroll summary:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

const getPayrollRecords = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        const records = await payrollService.getPayrollRecords(organizationId, start, end);
        return successResponse(res, records, 'Payroll records retrieved successfully');
    } catch (error) {
        console.error('Error fetching payroll records:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

module.exports = {
    getPayrollSummary,
    getPayrollRecords
};
