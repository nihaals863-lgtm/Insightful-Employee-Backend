const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TrackingService {
    async getProfiles(organizationId) {
        let profiles = await prisma.trackingSetting.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'asc' }
        });

        if (profiles.length === 0) {
            // Create default profiles
            const defaultProfiles = [
                {
                    title: 'Company Computers',
                    computerType: 'company',
                    isDefault: true,
                    visibility: 'stealth',
                    screenshotsPerHour: 0,
                    idleTime: 2,
                    trackingScenario: 'unlimited',
                    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    permissions: { canAnalyze: false, canSeeApps: false, canAddManual: false },
                    organizationId
                },
                {
                    title: 'Personal Computers',
                    computerType: 'personal',
                    isDefault: false,
                    visibility: 'visible',
                    screenshotsPerHour: 0,
                    idleTime: 2,
                    trackingScenario: 'manual',
                    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    permissions: { canAnalyze: false, canSeeApps: false, canAddManual: false },
                    organizationId
                }
            ];

            for (const p of defaultProfiles) {
                await prisma.trackingSetting.create({ data: p });
            }

            profiles = await prisma.trackingSetting.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'asc' }
            });
        }

        return profiles;
    }

    async createProfile(organizationId, data) {
        // If this is the first profile, or if isDefault is true, manage defaults
        if (data.isDefault) {
            await prisma.trackingSetting.updateMany({
                where: { organizationId, isDefault: true },
                data: { isDefault: false }
            });
        }

        return await prisma.trackingSetting.create({
            data: {
                ...data,
                organizationId
            }
        });
    }

    async updateProfile(id, organizationId, data) {
        if (data.isDefault) {
            await prisma.trackingSetting.updateMany({
                where: { organizationId, isDefault: true, NOT: { id } },
                data: { isDefault: false }
            });
        }

        return await prisma.trackingSetting.update({
            where: { id, organizationId },
            data
        });
    }

    async deleteProfile(id, organizationId) {
        return await prisma.trackingSetting.delete({
            where: { id, organizationId }
        });
    }

    async getAdvancedSettings(organizationId) {
        let settings = await prisma.advancedTrackingSetting.findUnique({
            where: { organizationId }
        });

        if (!settings) {
            // Create default settings if not exists
            settings = await prisma.advancedTrackingSetting.create({
                data: { organizationId }
            });
        }

        return settings;
    }

    async updateAdvancedSettings(organizationId, data) {
        return await prisma.advancedTrackingSetting.upsert({
            where: { organizationId },
            update: data,
            create: {
                ...data,
                organizationId
            }
        });
    }
}

module.exports = new TrackingService();
