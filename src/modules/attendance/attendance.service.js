const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const attendanceService = {
    clockIn: async (employeeId, organizationId) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if already clocked in today
        const existing = await prisma.attendance.findFirst({
            where: {
                employeeId,
                date: today,
            }
        });

        if (existing) {
            throw new Error('Already clocked in today');
        }

        // Get employee's shift for today to detect lateness
        const shift = await prisma.shift.findFirst({
            where: {
                employeeId,
                date: today,
            }
        });

        let late = false;
        if (shift) {
            const now = new Date();
            const [sHour, sMin] = shift.startTime.split(':').map(Number);
            const shiftStartTime = new Date();
            shiftStartTime.setHours(sHour, sMin, 0, 0);

            if (now > shiftStartTime) {
                late = true;
            }
        }

        return await prisma.attendance.create({
            data: {
                employeeId,
                organizationId,
                date: today,
                clockIn: new Date(),
                status: 'PRESENT',
                late,
            }
        });
    },

    clockOut: async (employeeId) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findFirst({
            where: {
                employeeId,
                date: today,
                clockOut: null,
            }
        });

        if (!attendance) {
            throw new Error('No active clock-in found for today');
        }

        const clockOutTime = new Date();
        const duration = Math.floor((clockOutTime - attendance.clockIn) / 1000); // in seconds

        return await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                clockOut: clockOutTime,
                duration,
            }
        });
    },

    getTimesheets: async (organizationId, filters = {}) => {
        const where = { organizationId };

        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.teamId) where.employee = { teamId: filters.teamId };
        if (filters.startDate && filters.endDate) {
            where.date = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate),
            };
        }

        return await prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        location: true,
                        team: {
                            select: { name: true, description: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' },
        });
    },

    addManualTime: async (data) => {
        const { employeeId, organizationId, startDate, startTime, endDate, endTime, timezone, type, description } = data;

        const start = new Date(`${startDate} ${startTime}`);
        const end = new Date(`${endDate} ${endTime}`);
        const duration = Math.floor((end - start) / 1000);

        return await prisma.manualTime.create({
            data: {
                employeeId,
                organizationId,
                startTime: start,
                endTime: end,
                timezone,
                type: type || 'Regular',
                duration: duration > 0 ? duration : 0,
                note: description,
            }
        });
    },

    getManualTimes: async (filters) => {
        const where = { organizationId: filters.organizationId };
        if (filters.employeeId) where.employeeId = filters.employeeId;

        return await prisma.manualTime.findMany({
            where,
            include: {
                employee: {
                    select: { fullName: true }
                }
            },
            orderBy: { startTime: 'desc' }
        });
    },

    getShifts: async (organizationId, employeeId = null) => {
        const where = { organizationId };
        if (employeeId) where.employeeId = employeeId;

        return await prisma.shift.findMany({
            where,
            include: {
                employee: {
                    select: { fullName: true }
                }
            },
            orderBy: { date: 'asc' }
        });
    },

    createShift: async (data) => {
        return await prisma.shift.create({
            data: {
                employeeId: data.employeeId,
                organizationId: data.organizationId,
                startTime: data.startTime,
                endTime: data.endTime,
                date: new Date(data.date),
            }
        });
    }
};

module.exports = attendanceService;
