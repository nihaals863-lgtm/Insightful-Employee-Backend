const productivityService = require('./productivity.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const productivityController = {
    getApps: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate, productivity } = req.query;
            if (!organizationId) return successResponse(res, [], 'No organization');
            let data = await productivityService.getAppsUsage(organizationId, startDate, endDate);
            if (productivity) {
                data = data.filter(a => a.productivity === productivity.toUpperCase());
            }
            return successResponse(res, data, 'App usage fetched');
        } catch (error) {
            console.error('[Productivity] getApps error:', error);
            return errorResponse(res, error.message);
        }
    },
};

module.exports = productivityController;
