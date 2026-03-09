const { getOrganizationId } = require('../../utils/orgId');
const projectsService = require('./projects.service');
const prisma = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response');

class ProjectsController {
    async createProject(req, res, next) {
        try {
            const organizationId = await getOrganizationId(req);

            if (!organizationId) {
                return errorResponse(res, 'Organization ID is required', 400);
            }

            const project = await projectsService.createProject(req.body, organizationId);
            return successResponse(res, project, 'Project created successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    async getProjects(req, res, next) {
        try {
            const organizationId = await getOrganizationId(req);

            if (!organizationId) {
                return errorResponse(res, 'Organization ID is required', 400);
            }

            const projects = await projectsService.getProjects(organizationId);
            return successResponse(res, projects, 'Projects fetched successfully');
        } catch (error) {
            next(error);
        }
    }

    async assignEmployees(req, res, next) {
        try {
            const { projectId, employeeIds } = req.body;
            const result = await projectsService.assignEmployees(projectId, employeeIds);
            return successResponse(res, result, 'Employees assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async logTime(req, res, next) {
        try {
            const log = await projectsService.logTime(req.body);
            return successResponse(res, log, 'Time logged successfully', 201);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProjectsController();
