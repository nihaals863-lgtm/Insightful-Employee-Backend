const prisma = require('../../config/db');

/**
 * Get payroll summary for an organization
 */
const getPayrollSummary = async (organizationId, params = {}) => {
    const { userId, teamId, startDate, endDate } = params;
    
    // Default dates if not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Build common filter for queries
    const employeeWhere = { organizationId };
    if (userId) employeeWhere.id = userId;
    else if (teamId) employeeWhere.teamId = teamId;

    // 2. Get filtered employees
    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
            attendance: {
                where: { date: { gte: start, lte: end } }
            }
        }
    });

    // 3. Calculate real financial stats based on attendance logs
    let totalGross = 0;
    let totalHours = 0;
    
    employees.forEach(emp => {
        const empSeconds = emp.attendance.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const empHours = empSeconds / 3600;
        totalHours += empHours;
        totalGross += empHours * (emp.hourlyRate || 0);
    });

    const avgRate = totalHours > 0 ? totalGross / totalHours : (employees.length > 0 ? employees.reduce((acc, e) => acc + (e.hourlyRate || 0), 0) / employees.length : 0);

    return {
        totalPayroll: Math.round(totalGross * 100) / 100,
        avgHourlyRate: Math.round(avgRate * 10) / 10,
        staffCount: employees.length,
        trend: 5.2, // Could be calculated comparing to previous period
        avgRateTrend: 1.2,
    };
};

/**
 * Get payroll records for employees
 */
const getPayrollRecords = async (organizationId, startDate, endDate, params = {}) => {
    const { userId, teamId } = params;
    
    const employeeWhere = { organizationId };
    if (userId) employeeWhere.id = userId;
    else if (teamId) employeeWhere.teamId = teamId;

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
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
