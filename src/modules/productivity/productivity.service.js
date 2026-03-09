const prisma = require('../../config/db');

const APPS = [
    { name: 'VS Code', domain: 'code.visualstudio.com', category: 'Development', productivity: 'PRODUCTIVE' },
    { name: 'GitHub', domain: 'github.com', category: 'Development', productivity: 'PRODUCTIVE' },
    { name: 'Slack', domain: 'slack.com', category: 'Communication', productivity: 'PRODUCTIVE' },
    { name: 'Gmail', domain: 'gmail.com', category: 'Communication', productivity: 'PRODUCTIVE' },
    { name: 'Zoom', domain: 'zoom.us', category: 'Communication', productivity: 'PRODUCTIVE' },
    { name: 'Figma', domain: 'figma.com', category: 'Design', productivity: 'PRODUCTIVE' },
    { name: 'Notion', domain: 'notion.so', category: 'Productivity', productivity: 'PRODUCTIVE' },
    { name: 'Jira', domain: 'atlassian.com', category: 'Project Mgmt', productivity: 'PRODUCTIVE' },
    { name: 'Google Docs', domain: 'docs.google.com', category: 'Productivity', productivity: 'PRODUCTIVE' },
    { name: 'YouTube', domain: 'youtube.com', category: 'Entertainment', productivity: 'UNPRODUCTIVE' },
    { name: 'Reddit', domain: 'reddit.com', category: 'Social', productivity: 'UNPRODUCTIVE' },
    { name: 'Twitter / X', domain: 'x.com', category: 'Social', productivity: 'UNPRODUCTIVE' },
    { name: 'Spotify', domain: 'spotify.com', category: 'Entertainment', productivity: 'NEUTRAL' },
    { name: 'Chrome', domain: 'chrome', category: 'Browser', productivity: 'NEUTRAL' },
    { name: 'Postman', domain: 'postman.com', category: 'Development', productivity: 'PRODUCTIVE' },
    { name: 'Udemy', domain: 'udemy.com', category: 'Learning', productivity: 'PRODUCTIVE' },
];

const productivityService = {
    /**
     * Get aggregated app usage from AppUsageLog
     */
    getAppsUsage: async (organizationId, startDate, endDate) => {
        const where = { organizationId };
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const logs = await prisma.appUsageLog.findMany({ where });

        const appMap = {};
        logs.forEach(log => {
            const key = log.appName;
            if (!appMap[key]) {
                appMap[key] = {
                    appName: log.appName,
                    domain: log.domain,
                    category: log.category,
                    productivity: log.productivity,
                    totalUsage: 0, // seconds
                };
            }
            appMap[key].totalUsage += log.duration || 0;
        });

        return Object.values(appMap)
            .map(app => ({
                ...app,
                totalUsageHours: Math.round((app.totalUsage / 3600) * 10) / 10,
                productivityLabel: app.productivity === 'PRODUCTIVE' ? 'Focus'
                    : app.productivity === 'UNPRODUCTIVE' ? 'Distraction'
                        : 'Neutral',
            }))
            .sort((a, b) => b.totalUsage - a.totalUsage);
    },
};

module.exports = productivityService;
module.exports.APPS = APPS;
