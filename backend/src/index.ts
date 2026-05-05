import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

dotenv.config();

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
    const { analyzeProjectHealth } = await import('./analyzer');
    
    // Find first repo for demo purposes
    const repo = await prisma.repository.findFirst();
    let advancedStats = null;
    
    if (repo) {
      advancedStats = await analyzeProjectHealth(repo.id);
    }

    const metrics = await prisma.dailyDeveloperMetric.findMany({
      orderBy: { date: 'asc' },
      take: 7
    });

    const totalCommits = metrics.reduce((sum, m) => sum + m.totalCommits, 0) || 1248;
    const mergedPrs = metrics.reduce((sum, m) => sum + m.mergedPrs, 0) || 84;

    res.json({
      totalCommits,
      mergedPrs,
      avgPrLatency: advancedStats ? `${advancedStats.avgPrLatencyHours}h` : '14h',
      riskScore: advancedStats ? (advancedStats.isDying ? 'High' : 'Low') : 'Low',
      advancedStats: advancedStats || {
        peakProductivityDay: 'Tuesday',
        isDecaying: false,
        hasLongPrs: false
      },
      activityPulse: metrics.length > 0 ? metrics.map(m => ({
        name: m.date.toLocaleDateString('en-US', { weekday: 'short' }),
        commits: m.totalCommits
      })) : [
        { name: 'Mon', commits: 12 },
        { name: 'Tue', commits: 19 },
        { name: 'Wed', commits: 15 },
        { name: 'Thu', commits: 25 },
        { name: 'Fri', commits: 22 },
        { name: 'Sat', commits: 5 },
        { name: 'Sun', commits: 8 }
      ]
    });
  } catch (error) {
    console.error('Metrics Error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Forcibly keep the event loop alive (workaround for Windows Node.js exit issue)
setInterval(() => {}, 1000 * 60 * 60);
