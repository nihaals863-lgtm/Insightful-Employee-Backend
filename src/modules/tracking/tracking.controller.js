const trackingService = require('./tracking.service');
const { successResponse, errorResponse } = require('../../utils/response');

class TrackingController {
    async getProfiles(req, res) {
        try {
            const profiles = await trackingService.getProfiles(req.user.organizationId);
            return successResponse(res, profiles, 'Tracking profiles fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async createProfile(req, res) {
        try {
            const profile = await trackingService.createProfile(req.user.organizationId, req.body);
            return successResponse(res, profile, 'Tracking profile created successfully', 201);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const profile = await trackingService.updateProfile(id, req.user.organizationId, req.body);
            return successResponse(res, profile, 'Tracking profile updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async deleteProfile(req, res) {
        try {
            const { id } = req.params;
            await trackingService.deleteProfile(id, req.user.organizationId);
            return successResponse(res, null, 'Tracking profile deleted successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async getAdvancedSettings(req, res) {
        try {
            const settings = await trackingService.getAdvancedSettings(req.user.organizationId);
            return successResponse(res, settings, 'Advanced settings fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateAdvancedSettings(req, res) {
        try {
            const settings = await trackingService.updateAdvancedSettings(req.user.organizationId, req.body);
            return successResponse(res, settings, 'Advanced settings updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
}

module.exports = new TrackingController();
