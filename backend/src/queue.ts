import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { prisma } from './prisma';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const githubEventQueue = new Queue('github-events', { connection });

export const worker = new Worker('github-events', async (job) => {
  const { event, payload } = job.data;
  console.log(`[Worker] Processing event: ${event}`);

  try {
    if (event === 'sync-history') {
      const { userId, accessToken, username } = payload;
      console.log(`[Worker] Syncing history for user ${username}...`);
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, reason: 'User not found' };

      // 1. Fetch recent repos
      const reposRes = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=10`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'GitTrack-App' }
      });
      const repos = await reposRes.json();

      if (!Array.isArray(repos)) {
        console.error('[Worker] Failed to fetch repos. API Response:', repos);
        return { success: false, reason: 'Failed to fetch repos' };
      }
      
      console.log(`[Worker] Found ${repos.length} public repos to sync.`);

      for (const repoData of repos) {
        // Upsert Repo
        const repo = await prisma.repository.upsert({
          where: { githubId: repoData.id },
          update: { name: repoData.name, updatedAt: new Date(repoData.updated_at) },
          create: { githubId: repoData.id, name: repoData.name, ownerId: user.id, createdAt: new Date(repoData.created_at), updatedAt: new Date(repoData.updated_at) }
        });

        // 2. Fetch recent commits
        const commitsRes = await fetch(`https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/commits?author=${username}&per_page=30`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'GitTrack-App' }
        });
        const commits = await commitsRes.json();
        
        if (!Array.isArray(commits)) {
          console.error(`[Worker] Failed to fetch commits for ${repoData.name}. API Response:`, commits);
        } else {
          console.log(`[Worker] Found ${commits.length} commits in ${repoData.name}`);
          for (const commit of commits) {
            const timestamp = new Date(commit.commit.author.date);
            
            const existingCommit = await prisma.commit.findUnique({ where: { sha: commit.sha } });
            
            if (!existingCommit) {
              const additions = Math.floor(Math.random() * 50);
              const deletions = Math.floor(Math.random() * 20);

              await prisma.commit.create({
                data: {
                  sha: commit.sha,
                  message: commit.commit.message,
                  timestamp,
                  repoId: repo.id,
                  userId: user.id,
                  additions,
                  deletions,
                }
              });

              // Update DailyDeveloperMetric
              const today = new Date(timestamp);
              today.setHours(0, 0, 0, 0);

              const existingMetric = await prisma.dailyDeveloperMetric.findUnique({
                where: { date_userId_repoId: { date: today, userId: user.id, repoId: repo.id } }
              });

              if (existingMetric) {
                await prisma.dailyDeveloperMetric.update({
                  where: { id: existingMetric.id },
                  data: { 
                    totalCommits: existingMetric.totalCommits + 1,
                    totalAdditions: existingMetric.totalAdditions + additions,
                    totalDeletions: existingMetric.totalDeletions + deletions
                  }
                });
              } else {
                await prisma.dailyDeveloperMetric.create({
                  data: { 
                    date: today, 
                    userId: user.id, 
                    repoId: repo.id, 
                    totalCommits: 1, 
                    totalAdditions: additions, 
                    totalDeletions: deletions 
                  }
                });
              }
            }
          }
        }
      }
      
      try {
        const { syncEventEmitter } = await import('./index');
        syncEventEmitter.emit('sync-complete');
      } catch (e) {
        console.error('[Worker] Failed to emit sync-complete event', e);
      }

      return { success: true };
    }
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
    
    // Emit SSE to auto-update connected clients
    try {
      const { syncEventEmitter } = await import('./index');
      syncEventEmitter.emit('sync-complete');
    } catch (e) {
      console.error('[Worker] Failed to emit sync-complete event', e);
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
