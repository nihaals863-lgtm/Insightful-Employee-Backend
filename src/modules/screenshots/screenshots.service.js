const prisma = require('../../config/db');

class ScreenshotsService {
    async createScreenshot(data) {
        return await prisma.screenshot.create({
            data
        });
    }

    async getScreenshots(where, limit = 50, offset = 0) {
        return await prisma.screenshot.findMany({
            where,
            take: limit,
            skip: offset,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        team: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: {
                capturedAt: 'desc'
            }
        });
    }

    async getScreenshotById(id) {
        return await prisma.screenshot.findUnique({
            where: { id },
            include: {
                employee: true
            }
        });
    }

    async toggleBlur(id) {
        const screenshot = await prisma.screenshot.findUnique({
            where: { id }
        });

        if (!screenshot) return null;

        return await prisma.screenshot.update({
            where: { id },
            data: {
                blurred: !screenshot.blurred
            }
        });
    }
}

module.exports = new ScreenshotsService();
