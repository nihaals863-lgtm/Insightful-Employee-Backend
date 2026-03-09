const prisma = require('../../config/db');

class TeamsService {
    async getTeams(organizationId, filter = {}) {
        return await prisma.team.findMany({
            where: { 
                organizationId,
                ...filter
            },
            include: {
                _count: {
                    select: { employees: true }
                },
                employees: {
                    select: {
                        id: true,
                        status: true
                    }
                }
            }
        });
    }

    async getTeamById(id) {
        return await prisma.team.findUnique({
            where: { id },
            include: {
                employees: true
            }
        });
    }

    async createTeam(data) {
        return await prisma.team.create({
            data
        });
    }

    async updateTeam(id, data) {
        return await prisma.team.update({
            where: { id },
            data
        });
    }

    async deleteTeam(id) {
        return await prisma.team.delete({
            where: { id }
        });
    }
}

module.exports = new TeamsService();
