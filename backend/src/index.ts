import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { EventEmitter } from 'events';

dotenv.config();

export const syncEventEmitter = new EventEmitter();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error });
  }
});

// GitHub OAuth Auth Endpoint
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      })
    });
    
    const tokenData = await tokenResponse.json() as any;
    if (tokenData.error) return res.status(401).json({ error: tokenData.error_description });
    
    const accessToken = tokenData.access_token;

    // 2. Fetch User from GitHub API
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const userData = await userResponse.json() as any;
    
    // 3. Upsert User in DB
    let user = await prisma.user.findUnique({ where: { githubId: userData.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: userData.id,
          username: userData.login,
          avatarUrl: userData.avatar_url,
          accessToken: accessToken,
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { accessToken: accessToken, avatarUrl: userData.avatar_url }
      });
    }

    // 4. Create JWT
    const jwtSecret = process.env.JWT_SECRET || 'super_secret';
    const sessionToken = jwt.sign({ userId: user.id, githubId: user.githubId }, jwtSecret, { expiresIn: '7d' });

    // 5. Trigger Historical Sync in Background
    try {
      const { githubEventQueue } = await import('./queue');
      await githubEventQueue.add('sync-history', { 
        event: 'sync-history', 
        payload: { userId: user.id, accessToken: user.accessToken, username: user.username }
      });
    } catch (e) {
      console.error('Failed to enqueue historical sync:', e);
    }

    res.json({ token: sessionToken, user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl } });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GitHub Webhook Endpoint
app.post('/api/webhooks/github', async (req, res) => {
  const event = req.headers['x-github-event'] as string;
  const payload = req.body;

  console.log(`Received GitHub event: ${event}`);
  
  if (event) {
    const { githubEventQueue } = await import('./queue');
    await githubEventQueue.add('process-event', { event, payload });
  }

  res.status(200).send({ status: 'queued' });
});

// Dashboard Metrics Endpoint
app.get('/api/metrics/dashboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'super_secret';
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    const { analyzeProjectHealth } = await import('./analyzer');
    
    // Find first repo belonging to this user for demo purposes
    const repo = await prisma.repository.findFirst({
      where: { ownerId: userId }
    });
    
    let advancedStats = null;
    if (repo) {
      advancedStats = await analyzeProjectHealth(repo.id);
    }

    // Calculate LIFETIME totals
    const lifetimeAgg = await prisma.dailyDeveloperMetric.aggregate({
      where: { userId: userId },
      _sum: { totalCommits: true, mergedPrs: true }
    });
    const totalCommits = lifetimeAgg._sum.totalCommits || 0;
    const mergedPrs = lifetimeAgg._sum.mergedPrs || 0;

    // Generate strict LAST 7 CALENDAR DAYS for the chart
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d;
    });

    const recentMetrics = await prisma.dailyDeveloperMetric.findMany({
      where: { 
        userId: userId,
        date: { gte: last7Days[0] }
      }
    });

    const activityPulse = last7Days.map(date => {
      const match = recentMetrics.find(m => m.date.getTime() === date.getTime());
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        commits: match ? match.totalCommits : 0
      };
    });

    res.json({
      totalCommits,
      mergedPrs,
      avgPrLatency: advancedStats ? `${advancedStats.avgPrLatencyHours}h` : '0h',
      riskScore: advancedStats ? (advancedStats.isDying ? 'High' : 'Low') : 'None',
      advancedStats: advancedStats || {
        peakProductivityDay: 'Not enough data',
        isDecaying: false,
        hasLongPrs: false
      },
      activityPulse
    });
  } catch (error) {
    console.error('Metrics Error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Delete Account Endpoint
app.delete('/api/users/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'super_secret';
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Prisma cascade deletes aren't configured explicitly in schema, so we delete relations first
    await prisma.dailyDeveloperMetric.deleteMany({ where: { userId } });
    await prisma.commit.deleteMany({ where: { userId } });
    await prisma.pullRequest.deleteMany({ where: { userId } });
    await prisma.repository.deleteMany({ where: { ownerId: userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete account data' });
  }
});

// Server-Sent Events Endpoint for live updates
app.get('/api/metrics/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('data: {"status": "connected"}\n\n');

  const onSyncComplete = () => {
    res.write('data: {"event": "sync-complete"}\n\n');
  };

  syncEventEmitter.on('sync-complete', onSyncComplete);

  req.on('close', () => {
    syncEventEmitter.off('sync-complete', onSyncComplete);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Forcibly keep the event loop alive (workaround for Windows Node.js exit issue)
setInterval(() => {}, 1000 * 60 * 60);
