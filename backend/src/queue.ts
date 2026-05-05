import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { prisma } from './prisma';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const githubEventQueue = new Queue('github-events', { connection });

export const worker = new Worker('github-events', async (job) => {
  const { event, payload } = job.data;
  console.log(`[Worker] Processing event: ${event}`);

  try {
    const repoData = payload.repository;
    const sender = payload.sender;

    if (!repoData || !sender) return { success: false, reason: 'No repo or sender data' };

    // 1. Ensure User exists
    let user = await prisma.user.findUnique({ where: { githubId: sender.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: sender.id,
          username: sender.login,
          avatarUrl: sender.avatar_url,
        }
      });
    }

    // 2. Ensure Repo exists
    let repo = await prisma.repository.findUnique({ where: { githubId: repoData.id } });
    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          githubId: repoData.id,
          name: repoData.name,
          ownerId: user.id,
        }
      });
    }

    if (event === 'push') {
      const commits = payload.commits || [];
      if (commits.length === 0) return { success: true, reason: 'No commits' };
      
      console.log(`[Worker] Processing ${commits.length} commits...`);
      
      let totalAdditions = 0;
      let totalDeletions = 0;

      for (const commitData of commits) {
        // NOTE: GitHub push webhook payloads don't include additions/deletions directly
        // In a real app we would fetch the commit details via API here. We'll mock it for now.
        const mockAdditions = Math.floor(Math.random() * 50);
        const mockDeletions = Math.floor(Math.random() * 20);

        await prisma.commit.create({
          data: {
            sha: commitData.id,
            message: commitData.message,
            timestamp: new Date(commitData.timestamp),
            repoId: repo.id,
            userId: user.id,
            additions: mockAdditions,
            deletions: mockDeletions,
          }
        });

        totalAdditions += mockAdditions;
        totalDeletions += mockDeletions;
      }

      // Map-Reduce: Update Daily Metric
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingMetric = await prisma.dailyDeveloperMetric.findUnique({
        where: { date_userId_repoId: { date: today, userId: user.id, repoId: repo.id } }
      });

      if (existingMetric) {
        await prisma.dailyDeveloperMetric.update({
          where: { id: existingMetric.id },
          data: {
            totalCommits: existingMetric.totalCommits + commits.length,
            totalAdditions: existingMetric.totalAdditions + totalAdditions,
            totalDeletions: existingMetric.totalDeletions + totalDeletions,
          }
        });
      } else {
        await prisma.dailyDeveloperMetric.create({
          data: {
            date: today,
            userId: user.id,
            repoId: repo.id,
            totalCommits: commits.length,
            totalAdditions,
            totalDeletions,
          }
        });
      }
      
    } else if (event === 'pull_request') {
       console.log(`[Worker] Processing PR action: ${payload.action}`);
       const prData = payload.pull_request;
       
       if (payload.action === 'opened' || payload.action === 'closed') {
         await prisma.pullRequest.upsert({
           where: { githubPrId: prData.id },
           update: {
             state: prData.state,
             closedAt: prData.closed_at ? new Date(prData.closed_at) : null,
             mergedAt: prData.merged_at ? new Date(prData.merged_at) : null,
           },
           create: {
             githubPrId: prData.id,
             state: prData.state,
             openedAt: new Date(prData.created_at),
             closedAt: prData.closed_at ? new Date(prData.closed_at) : null,
             mergedAt: prData.merged_at ? new Date(prData.merged_at) : null,
             repoId: repo.id,
             userId: user.id,
           }
         });
       }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`[Worker] Failed to process job ${job.id}:`, error);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
});
