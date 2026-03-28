const prisma = require('../../config/db');
const fs = require('fs');
const path = require('path');

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

    /**
     * Hard-delete a screenshot permanently (Admin/Manager only)
     * Also removes the physical image file from disk
     */
    async deleteScreenshot(id) {
        const screenshot = await prisma.screenshot.findUnique({ where: { id } });
        if (!screenshot) return null;

        // Delete physical file if it's a local upload
        if (screenshot.imageUrl && screenshot.imageUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '../../../public', screenshot.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        return await prisma.screenshot.delete({ where: { id } });
    }

    /**
     * Soft-delete for employee: marks deletedByEmployee = true
     * Screenshot remains visible to Admin/Manager
     */
    async softDeleteForEmployee(id) {
        return await prisma.screenshot.update({
            where: { id },
            data: { deletedByEmployee: true }
        });
    }
}

module.exports = new ScreenshotsService();
