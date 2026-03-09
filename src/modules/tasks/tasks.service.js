const prisma = require('../../config/db');

class TasksService {
    async createTask(data, organizationId) {
        const { name, projectId, employeeId, priority, dueDate, status } = data;

        if (!organizationId) {
            throw new Error('Organization ID is required to create a task');
        }

        return await prisma.task.create({
            data: {
                name,
                priority: priority || 'MEDIUM',
                status: status || 'BACKLOG',
                dueDate: dueDate ? new Date(dueDate) : null,
                project: {
                    connect: { id: projectId }
                },
                organization: {
                    connect: { id: organizationId }
                },
                ...(employeeId && {
                    employee: {
                        connect: { id: employeeId }
                    }
                })
            },
            include: {
                project: true,
                employee: true,
            }
        });
    }

    async getTasks(organizationId, filter = {}) {
        return await prisma.task.findMany({
            where: { 
                organizationId,
                ...filter
            },
            include: {
                project: true,
                employee: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateTask(id, data) {
        const { name, priority, dueDate, status, employeeId } = data;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (priority) updateData.priority = priority;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (status) updateData.status = status;
        if (employeeId !== undefined) updateData.employeeId = employeeId;

        return await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                project: true,
                employee: true,
            }
        });
    }

    async updateTaskStatus(id, status) {
        return await prisma.task.update({
            where: { id },
            data: { status },
        });
    }

    async deleteTask(id) {
        return await prisma.task.delete({
            where: { id },
        });
    }

    async getBoardTasks(organizationId) {
        const tasks = await this.getTasks(organizationId);
        
        // Group tasks by status for the Kanban board
        const board = {
            BACKLOG: [],
            IN_PROGRESS: [],
            QA: [],
            COMPLETED: []
        };

        tasks.forEach(task => {
            if (board[task.status]) {
                board[task.status].push({
                    id: task.id,
                    title: task.name,
                    project: task.project.name,
                    projectId: task.projectId,
                    priority: task.priority,
                    assignee: task.employee ? task.employee.fullName : 'Unassigned',
                    assigneeId: task.employeeId,
                    status: task.status,
                    dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'No Date',
                    createdAt: task.createdAt
                });
            }
        });

        return board;
    }
}

module.exports = new TasksService();
