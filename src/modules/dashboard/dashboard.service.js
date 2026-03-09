const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to format seconds to HH:mm
function formatToHM(seconds) {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate summary metrics
async function calculateMetrics(organizationId, employeeId = null, teamId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = { organizationId, timestamp: { gte: today } };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    let activeTime = 0;
    let idleTime = 0;
    
    logs.forEach(log => {
        if (log.status === 'ACTIVE') activeTime += log.duration;
        if (log.status === 'IDLE') idleTime += log.duration;
    });

    const manualWhere = { organizationId, startTime: { gte: today } };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });
    const manualTime = manualLogs.reduce((acc, log) => acc + log.duration, 0);

    const workTime = activeTime + manualTime + idleTime;
    const productiveTime = activeTime + manualTime; // Assuming active is productive
    
    const utilization = workTime > 0 ? Math.round((productiveTime / workTime) * 100) : 0;
    
    return {
        workTime: formatToHM(workTime),
        activeTime: formatToHM(activeTime),
        idleTime: formatToHM(idleTime),
        manualTime: formatToHM(manualTime),
        productiveTime: formatToHM(productiveTime),
        unproductiveTime: formatToHM(idleTime),
        neutralTime: '00:00',
        utilization,
        totalWorkHours: Number((workTime / 3600).toFixed(2))
    };
}

// Calculate intraday chart data
async function getIntradayActivity(organizationId, employeeId = null, teamId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = { organizationId, timestamp: { gte: today } };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    const manualWhere = { organizationId, startTime: { gte: today } };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });

    // Group by hour
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
        hourlyData[i] = { active: 0, idle: 0, break: 0, manual: 0 };
    }

    logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        if (log.status === 'ACTIVE') hourlyData[hour].active += log.duration;
        if (log.status === 'IDLE') hourlyData[hour].idle += log.duration;
    });

    manualLogs.forEach(log => {
        const hour = new Date(log.startTime).getHours();
        hourlyData[hour].manual += log.duration;
    });

    // Format for Recharts
    const result = [];
    for (let i = 8; i <= 20; i += 2) { // 8 AM to 8 PM roughly
        result.push({
            name: `${i.toString().padStart(2, '0')}:00`,
            active: Number((hourlyData[i].active / 3600).toFixed(2)),
            idle: Number((hourlyData[i].idle / 3600).toFixed(2)),
            break: 0, // Implement break tracking if schema supports it later
            manual: Number((hourlyData[i].manual / 3600).toFixed(2)),
        });
    }

    return result;
}

// Calculate top/bottom employees
async function getEmployeeRankings(organizationId, teamId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = { organizationId, timestamp: { gte: today } };
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ 
        where: whereClause,
        include: { employee: { include: { team: true } } }
    });

    const manualWhere = { organizationId, startTime: { gte: today } };
    if (teamId) manualWhere.employee = { teamId };

    const manualLogs = await prisma.manualTime.findMany({ 
        where: manualWhere,
        include: { employee: true }
    });

    const empStats = {};
    
    const initEmp = (emp) => {
        if (!empStats[emp.id]) {
            empStats[emp.id] = {
                name: emp.fullName,
                initials: emp.fullName.substring(0, 2).toUpperCase(),
                team: emp.team?.name || 'Unassigned',
                active: 0,
                idle: 0,
                manual: 0
            };
        }
    };

    logs.forEach(log => {
        initEmp(log.employee);
        if (log.status === 'ACTIVE') empStats[log.employee.id].active += log.duration;
        if (log.status === 'IDLE') empStats[log.employee.id].idle += log.duration;
    });

    manualLogs.forEach(log => {
        initEmp(log.employee);
        empStats[log.employee.id].manual += log.duration;
    });

    const rankings = Object.values(empStats).map(e => {
        const prod = e.active + e.manual;
        const total = prod + e.idle;
        const util = total > 0 ? Math.round((prod / total) * 100) : 0;
        return {
            ...e,
            productive: formatToHM(prod),
            unproductive: formatToHM(e.idle),
            utilization: util,
            _rawUtil: util // For sorting
        };
    });

    rankings.sort((a, b) => b._rawUtil - a._rawUtil);

    return {
        topProductive: rankings.slice(0, 5),
        topUnproductive: [...rankings].reverse().slice(0, 5)
    };
}

const getAdminDashboard = async (organizationId) => {
    const [employees, teams, totalAttendance] = await Promise.all([
        prisma.employee.findMany({ where: { organizationId } }),
        prisma.team.findMany({ where: { organizationId } }),
        prisma.attendance.count({ where: { organizationId } })
    ]);

    const summary = await calculateMetrics(organizationId);
    const intradayActivity = await getIntradayActivity(organizationId);
    const rankings = await getEmployeeRankings(organizationId);

    // Simplistic team stats based on employee count for now
    const teamStats = teams.map(t => ({
        id: t.id,
        name: t.name,
        productivity: 85, // Mock until detailed team rollup is needed
    }));

    return {
        employees,
        teams: teamStats,
        totalAttendance,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        topProductive: rankings.topProductive,
        topUnproductive: rankings.topUnproductive
    };
};

const getManagerDashboard = async (organizationId, teamId) => {
    const [employees, activityLogs, tasks, attendance] = await Promise.all([
        prisma.employee.findMany({ where: { organizationId, teamId } }),
        prisma.activityLog.findMany({
            where: { organizationId, employee: { teamId } },
            take: 10,
            orderBy: { timestamp: 'desc' }
        }),
        prisma.task.findMany({ where: { organizationId, employee: { teamId } } }),
        prisma.attendance.count({ where: { organizationId, employee: { teamId } } })
    ]);

    const summary = await calculateMetrics(organizationId, null, teamId);
    const intradayActivity = await getIntradayActivity(organizationId, null, teamId);
    const rankings = await getEmployeeRankings(organizationId, teamId);

    // Provide contextTeams for the manager UI to avoid crashes if UI expects an array
    const contextTeams = await prisma.team.findMany({ where: { id: teamId } });

    return {
        employees,
        activityLogs,
        tasks,
        totalAttendance: attendance,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        topProductive: rankings.topProductive,
        topUnproductive: rankings.topUnproductive,
        teams: contextTeams
    };
};

const getEmployeeDashboard = async (organizationId, employeeId) => {
    const [activityLogs, attendanceList, tasks, screenshots] = await Promise.all([
        prisma.activityLog.findMany({
            where: { organizationId, employeeId },
            take: 20,
            orderBy: { timestamp: 'desc' }
        }),
        prisma.attendance.findMany({
            where: { organizationId, employeeId },
            take: 5,
            orderBy: { date: 'desc' }
        }),
        prisma.task.findMany({ where: { organizationId, employeeId } }),
        prisma.screenshot.findMany({
            where: { organizationId, employeeId },
            take: 5,
            orderBy: { capturedAt: 'desc' }
        })
    ]);

    const summary = await calculateMetrics(organizationId, employeeId);
    const intradayActivity = await getIntradayActivity(organizationId, employeeId);

    return {
        activityLogs,
        attendance: attendanceList,
        tasks,
        screenshots,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        // RBAC: Empty peer data for Employees
        topProductive: [],
        topUnproductive: [],
        teams: []
    };
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};
