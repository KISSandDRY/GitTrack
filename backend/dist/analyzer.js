"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProjectHealth = analyzeProjectHealth;
const prisma_1 = require("./prisma");
async function analyzeProjectHealth(repoId) {
    // 1. Fetch last 30 days of metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const metrics = await prisma_1.prisma.dailyDeveloperMetric.findMany({
        where: { repoId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'asc' },
    });
    // Risk Detection: Dying Repo
    const lastCommitDate = metrics.length > 0 ? metrics[metrics.length - 1].date : null;
    const isDying = !lastCommitDate || (new Date().getTime() - lastCommitDate.getTime()) > (14 * 24 * 60 * 60 * 1000); // No commits in 14 days
    // Risk Detection: Long PRs
    const prs = await prisma_1.prisma.pullRequest.findMany({
        where: { repoId, state: 'closed', mergedAt: { not: null } },
        orderBy: { closedAt: 'desc' },
        take: 20
    });
    let avgPrLatencyHours = 0;
    if (prs.length > 0) {
        const totalLatency = prs.reduce((sum, pr) => {
            const opened = new Date(pr.openedAt).getTime();
            const closed = new Date(pr.closedAt).getTime();
            return sum + (closed - opened);
        }, 0);
        avgPrLatencyHours = (totalLatency / prs.length) / (1000 * 60 * 60);
    }
    const hasLongPrs = avgPrLatencyHours > 48;
    // Smart Insights: Peak Day
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    metrics.forEach(m => {
        dayCounts[m.date.getDay()] += m.totalCommits;
    });
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let peakDay = 0;
    for (let i = 1; i < 7; i++) {
        if (dayCounts[i] > dayCounts[peakDay])
            peakDay = i;
    }
    // Activity Prediction (Exponential Decay Approximation)
    // We approximate lambda by comparing first half of the month vs second half
    let firstHalfCommits = 0;
    let secondHalfCommits = 0;
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - 15);
    metrics.forEach(m => {
        if (m.date < midPoint)
            firstHalfCommits += m.totalCommits;
        else
            secondHalfCommits += m.totalCommits;
    });
    // If second half is significantly less than first half, we have decay
    const isDecaying = firstHalfCommits > 0 && secondHalfCommits < (firstHalfCommits * 0.5);
    return {
        isDying,
        avgPrLatencyHours: Math.round(avgPrLatencyHours * 10) / 10,
        hasLongPrs,
        peakProductivityDay: days[peakDay],
        isDecaying
    };
}
