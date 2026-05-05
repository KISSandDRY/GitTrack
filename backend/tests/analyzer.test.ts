import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { analyzeProjectHealth } from '../src/analyzer';
import { prisma } from '../src/prisma';

// Mock Prisma
jest.mock('../src/prisma', () => ({
  prisma: {
    dailyDeveloperMetric: {
      findMany: jest.fn(),
    },
    pullRequest: {
      findMany: jest.fn(),
    },
  }
}));

describe('analyzeProjectHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects a dying repository', async () => {
    // Mock no metrics in the last 14 days
    (prisma.dailyDeveloperMetric.findMany as jest.Mock<any>).mockResolvedValue([]);
    (prisma.pullRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

    const result = await analyzeProjectHealth('test-repo-1');
    expect(result.isDying).toBe(true);
  });

  it('detects an active repository', async () => {
    // Mock a recent metric
    (prisma.dailyDeveloperMetric.findMany as jest.Mock<any>).mockResolvedValue([
      { date: new Date(), totalCommits: 5 }
    ]);
    (prisma.pullRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

    const result = await analyzeProjectHealth('test-repo-2');
    expect(result.isDying).toBe(false);
  });

  it('calculates average PR latency', async () => {
    // Mock PRs
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
    
    (prisma.dailyDeveloperMetric.findMany as jest.Mock<any>).mockResolvedValue([]);
    (prisma.pullRequest.findMany as jest.Mock<any>).mockResolvedValue([
      { openedAt: twoDaysAgo, closedAt: now } // 48 hours latency
    ]);

    const result = await analyzeProjectHealth('test-repo-3');
    expect(result.avgPrLatencyHours).toBe(48);
  });

  it('detects exponential decay (activity dropping)', async () => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000));
    const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));

    // High activity in first half, low in second half
    (prisma.dailyDeveloperMetric.findMany as jest.Mock<any>).mockResolvedValue([
      { date: twentyDaysAgo, totalCommits: 50 },
      { date: tenDaysAgo, totalCommits: 10 }
    ]);
    (prisma.pullRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

    const result = await analyzeProjectHealth('test-repo-4');
    expect(result.isDecaying).toBe(true);
  });
});
