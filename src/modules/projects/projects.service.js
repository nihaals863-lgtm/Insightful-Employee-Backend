const prisma = require('../../config/db');

class ProjectsService {
    async createProject(data, organizationId) {
        const { name, billRate, employeeIds } = data;

        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    name,
                    billableRate: parseFloat(billRate) || 0,
                    organizationId,
                },
            });

            if (employeeIds && employeeIds.length > 0) {
                await tx.projectAssignment.createMany({
                    data: employeeIds.map(employeeId => ({
                        projectId: project.id,
                        employeeId,
                    })),
                });
            }

            return {
                id: project.id,
                projectName: project.name,
                assignees: employeeIds?.length || 0,
                tasks: 0,
                totalTime: '00:00',
                clockedTime: '00:00',
                manualTime: '00:00',
                billRate: project.billableRate,
                totalCosts: (0).toFixed(2),
            };
        });
    }

    async getProjects(organizationId) {
        const projects = await prisma.project.findMany({
            where: { organizationId },
            include: {
                assignments: {
                    include: {
                        employee: true,
                    },
                },
                timeLogs: true,
                _count: {
                    select: { tasks: true }
                }
            },
        });

        return projects.map(project => {
            const totalSeconds = project.timeLogs.reduce((acc, log) => acc + log.duration, 0);
            const clockedSeconds = project.timeLogs
                .filter(log => log.type === 'CLOCKED')
                .reduce((acc, log) => acc + log.duration, 0);
            const manualSeconds = project.timeLogs
                .filter(log => log.type === 'MANUAL')
                .reduce((acc, log) => acc + log.duration, 0);

            const totalHours = totalSeconds / 3600;
            const billableCost = totalHours * project.billableRate;

            return {
                id: project.id,
                projectName: project.name,
                assignees: project.assignments.length,
                tasks: project._count.tasks,
                totalTime: this.formatDuration(totalSeconds),
                clockedTime: this.formatDuration(clockedSeconds),
                manualTime: this.formatDuration(manualSeconds),
                billRate: project.billableRate,
                totalCosts: billableCost.toFixed(2),
            };
        });
    }

    async assignEmployees(projectId, employeeIds) {
        return await prisma.projectAssignment.createMany({
            data: employeeIds.map(employeeId => ({
                projectId,
                employeeId,
            })),
            skipDuplicates: true,
        });
    }

    async logTime(data) {
        const { projectId, employeeId, duration, type } = data;
        return await prisma.projectTimeLog.create({
            data: {
                projectId,
                employeeId,
                duration: parseInt(duration),
                type: type || 'CLOCKED',
            },
        });
    }

    async updateProject(id, data) {
        const { name, billRate, employeeIds } = data;

        return await prisma.$transaction(async (tx) => {
            // Update project basic info
            const project = await tx.project.update({
                where: { id },
                data: {
                    name,
                    billableRate: parseFloat(billRate) || 0,
                },
            });

            // Update assignments - simple way: delete all and re-add
            if (employeeIds) {
                await tx.projectAssignment.deleteMany({
                    where: { projectId: id },
                });

                if (employeeIds.length > 0) {
                    await tx.projectAssignment.createMany({
                        data: employeeIds.map(employeeId => ({
                            projectId: id,
                            employeeId,
                        })),
                    });
                }
            }

            // Return the full project object as the frontend expects it
            const fullProject = await tx.project.findUnique({
                where: { id },
                include: {
                    assignments: { include: { employee: true } },
                    timeLogs: true,
                    _count: { select: { tasks: true } }
                }
            });

            const totalSeconds = fullProject.timeLogs.reduce((acc, log) => acc + log.duration, 0);
            const clockedSeconds = fullProject.timeLogs
                .filter(log => log.type === 'CLOCKED')
                .reduce((acc, log) => acc + log.duration, 0);
            const manualSeconds = fullProject.timeLogs
                .filter(log => log.type === 'MANUAL')
                .reduce((acc, log) => acc + log.duration, 0);

            const totalHours = totalSeconds / 3600;
            const billableCost = totalHours * fullProject.billableRate;

            return {
                id: fullProject.id,
                projectName: fullProject.name,
                assignees: fullProject.assignments.length,
                tasks: fullProject._count.tasks,
                totalTime: this.formatDuration(totalSeconds),
                clockedTime: this.formatDuration(clockedSeconds),
                manualTime: this.formatDuration(manualSeconds),
                billRate: fullProject.billableRate,
                totalCosts: billableCost.toFixed(2),
            };
        });
    }

    async deleteProject(id) {
        return await prisma.$transaction(async (tx) => {
            // Delete related entries first
            await tx.projectAssignment.deleteMany({ where: { projectId: id } });
            await tx.projectTimeLog.deleteMany({ where: { projectId: id } });
            await tx.task.deleteMany({ where: { projectId: id } }); // Optional, but tasks usually belong to projects
            
            return await tx.project.delete({
                where: { id },
            });
        });
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

module.exports = new ProjectsService();
