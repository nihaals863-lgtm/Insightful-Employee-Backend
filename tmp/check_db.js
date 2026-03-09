const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const attendanceCount = await prisma.attendance.count();
    const shiftCount = await prisma.shift.count();
    const manualTimeCount = await prisma.manualTime.count();
    const employeeCount = await prisma.employee.count();

    console.log({
        attendanceCount,
        shiftCount,
        manualTimeCount,
        employeeCount
    });

    const recentAttendance = await prisma.attendance.findMany({
        take: 5,
        include: { employee: true }
    });
    console.log('Recent Attendance:', JSON.stringify(recentAttendance, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
