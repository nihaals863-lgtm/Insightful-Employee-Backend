const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class GoalsService {
    async createGoal(data, organizationId) {
        const { title, sub, targetDate, color, stakeholders } = data;
        
        return await prisma.goal.create({
            data: {
                title,
                sub,
                targetDate,
                color: color || "text-indigo-600 bg-indigo-50",
                organizationId,
                progress: 0,
                status: 'ACTIVE',
                stakeholders: stakeholders && stakeholders.length > 0 ? {
                    create: stakeholders.map(empId => ({
                        employeeId: empId
                    }))
                } : undefined
            },
            include: {
                stakeholders: {
                    include: {
                        employee: true
                    }
                },
                activities: true
            }
        });
    }

    async getGoals(organizationId, filter = {}) {
        return await prisma.goal.findMany({
            where: {
                organizationId,
                ...filter
            },
            include: {
                stakeholders: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                fullName: true,
                                avatar: true
                            }
                        }
                    }
                },
                activities: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async updateGoal(id, data) {
        const { title, sub, targetDate, progress, status, color, stakeholders } = data;

        // If stakeholders are provided, we should sync them
        if (stakeholders) {
            // Simple approach: delete all and recreate
            await prisma.goalStakeholder.deleteMany({
                where: { goalId: id }
            });

            return await prisma.goal.update({
                where: { id },
                data: {
                    title,
                    sub,
                    targetDate,
                    progress,
                    status,
                    color,
                    stakeholders: {
                        create: stakeholders.map(empId => ({
                            employeeId: empId
                        }))
                    }
                },
                include: {
                    stakeholders: {
                        include: {
                            employee: true
                        }
                    }
                }
            });
        }

        return await prisma.goal.update({
            where: { id },
            data: {
                title,
                sub,
                targetDate,
                progress,
                status,
                color
            },
            include: {
                stakeholders: {
                    include: {
                        employee: true
                    }
                }
            }
        });
    }

    async deleteGoal(id) {
        return await prisma.goal.delete({
            where: { id }
        });
    }

    async addActivity(goalId, activityData) {
        const { title, status, type } = activityData;
        return await prisma.goalActivity.create({
            data: {
                goalId,
                title,
                status,
                type
            }
        });
    }
}

module.exports = new GoalsService();
