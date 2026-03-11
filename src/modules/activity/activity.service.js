const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activityService = {
    createActivityLog: async (data) => {
        const settings = await prisma.complianceSetting.findUnique({
            where: { organizationId: data.organizationId }
        });

        if (settings && !settings.activityMonitoring) {
            return null;
        }

        return await prisma.activityLog.create({
            data: {
                employeeId: data.employeeId,
                organizationId: data.organizationId,
                activityType: data.activityType,
                productivity: data.productivity,
                duration: data.duration,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                appWebsite: data.appWebsite || 'Unknown',
            },
        });
    },

    getEmployeeActivity: async (employeeId, startDate, endDate) => {
        const where = {
            employeeId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
        });
    },

    getTeamActivity: async (teamId, startDate, endDate) => {
        const where = {
            employee: {
                teamId,
            },
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
    },

    getOrganizationActivity: async (organizationId, startDate, endDate) => {
        const where = {
            organizationId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        team: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
    },

    getOrganizationSummary: async (organizationId, startDate, endDate, params) => {
        const where = {
            organizationId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        team: {
                            select: { name: true }
                        }
                    },
                },
            },
        });

        console.log(`[ActivityService] Found ${logs.length} logs for org ${organizationId}`);

        // Group by Date and Employee
        const summaryMap = {};

        logs.forEach(log => {
            if (!log.employee) {
                console.warn(`[ActivityService] Missing employee for log ID ${log.id}`);
                return;
            }

            const date = log.timestamp ? log.timestamp.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const empId = log.employeeId;
            const key = `${date}_${empId}`;

            if (!summaryMap[key]) {
                summaryMap[key] = {
                    id: key,
                    employeeId: empId,
                    name: log.employee.fullName || 'Unknown',
                    team: log.employee.team?.name || 'General',
                    date: date,
                    workHours: 0,
                    activeHours: 0,
                    idleHours: 0,
                    productiveHours: 0,
                    unproductiveHours: 0,
                    neutralHours: 0,
                    intradayBuckets: Array.from({ length: 24 }, (_, i) => ({
                        name: `${String(i).padStart(2, '0')}:00`,
                        active: 0,
                        idle: 0,
                        manual: 0,
                        break: 0
                    }))
                };
            }

            const item = summaryMap[key];
            const durationHrs = log.duration / 3600;

            // Types
            if (log.activityType === 'ACTIVE') item.activeHours += durationHrs;
            if (log.activityType === 'IDLE') item.idleHours += durationHrs;

            // Productivity
            if (log.productivity === 'PRODUCTIVE') item.productiveHours += durationHrs;
            if (log.productivity === 'UNPRODUCTIVE') item.unproductiveHours += durationHrs;
            if (log.productivity === 'NEUTRAL') item.neutralHours += durationHrs;

            // Total Work Hours (Active + Idle + Manual) - simplified
            item.workHours = item.activeHours + item.idleHours;

            // Hourly bucket
            const hour = log.timestamp.getHours();
            if (log.activityType === 'ACTIVE') item.intradayBuckets[hour].active += durationHrs;
            if (log.activityType === 'IDLE') item.intradayBuckets[hour].idle += durationHrs;
        });

        // Calculate percentages
        return Object.values(summaryMap).map(item => {
            const productivityPct = item.activeHours > 0 ? Math.round((item.productiveHours / item.activeHours) * 100) : 0;
            const utilizationPct = item.workHours > 0 ? Math.round((item.activeHours / item.workHours) * 100) : 0;

            return {
                ...item,
                productivityPct,
                utilizationPct
            };
        });
    },
    getEmployeeSummary: async (employeeId, startDate, endDate) => {
        const where = {
            employeeId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
        });

        const summary = {
            activeHours: 0,
            idleHours: 0,
            productiveHours: 0,
            unproductiveHours: 0,
            totalHours: 0
        };

        logs.forEach(log => {
            const durationHrs = log.duration / 3600;
            if (log.activityType === 'ACTIVE') summary.activeHours += durationHrs;
            if (log.activityType === 'IDLE') summary.idleHours += durationHrs;
            if (log.productivity === 'PRODUCTIVE') summary.productiveHours += durationHrs;
            if (log.productivity === 'UNPRODUCTIVE') summary.unproductiveHours += durationHrs;
        });

        summary.totalHours = summary.activeHours + summary.idleHours;
        summary.productivityPct = summary.activeHours > 0 ? Math.round((summary.productiveHours / summary.activeHours) * 100) : 0;
        summary.utilizationPct = summary.totalHours > 0 ? Math.round((summary.activeHours / summary.totalHours) * 100) : 0;

        return summary;
    },
};

module.exports = activityService;
