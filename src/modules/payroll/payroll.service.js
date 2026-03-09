const prisma = require('../../config/db');

/**
 * Get payroll summary for an organization
 */
const getPayrollSummary = async (organizationId) => {
    // 1. Get all employees in organization
    const employees = await prisma.employee.findMany({
        where: { organizationId },
        select: {
            id: true,
            fullName: true,
            role: true,
            hourlyRate: true,
        }
    });

    // 2. Mock some recent financial stats for the top cards
    // In a real app, this would query aggregated logs or a financials table
    const totalGross = employees.reduce((acc, emp) => acc + (emp.hourlyRate * 160), 0); // Assuming 160h avg
    const avgRate = employees.length > 0 
        ? employees.reduce((acc, emp) => acc + emp.hourlyRate, 0) / employees.length 
        : 0;

    return {
        totalPayroll: totalGross,
        avgHourlyRate: avgRate,
        staffCount: employees.length,
        trend: 5.2, // Mock trend
        avgRateTrend: 1.2, // Mock trend
    };
};

/**
 * Get payroll records for employees
 */
const getPayrollRecords = async (organizationId, startDate, endDate) => {
    const employees = await prisma.employee.findMany({
        where: { organizationId },
        include: {
            attendance: {
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            }
        }
    });

    return employees.map(emp => {
        const totalSeconds = emp.attendance.reduce((acc, curr) => acc + curr.duration, 0);
        const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
        
        // Use real hourly rate from DB
        const rate = emp.hourlyRate || 50;
        const grossPay = totalHours * rate;
        
        return {
            id: emp.id,
            employee: emp.fullName,
            role: emp.role,
            totalHours,
            hourlyRate: rate,
            grossPay,
            status: totalHours > 0 ? 'Ready' : 'Pending'
        };
    });
};

module.exports = {
    getPayrollSummary,
    getPayrollRecords
};
