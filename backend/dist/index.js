"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', async (req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', error });
    }
});
// GitHub OAuth Auth Endpoint
app.post('/api/auth/github', async (req, res) => {
    const { code } = req.body;
    if (!code)
        return res.status(400).json({ error: 'No code provided' });
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
        const tokenData = await tokenResponse.json();
        if (tokenData.error)
            return res.status(401).json({ error: tokenData.error_description });
        const accessToken = tokenData.access_token;
        // 2. Fetch User from GitHub API
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await userResponse.json();
        // 3. Upsert User in DB
        let user = await prisma_1.prisma.user.findUnique({ where: { githubId: userData.id } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    githubId: userData.id,
                    username: userData.login,
                    avatarUrl: userData.avatar_url,
                    accessToken: accessToken,
                }
            });
        }
        else {
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { accessToken: accessToken, avatarUrl: userData.avatar_url }
            });
        }
        // 4. Create JWT
        const jwtSecret = process.env.JWT_SECRET || 'super_secret';
        const sessionToken = jsonwebtoken_1.default.sign({ userId: user.id, githubId: user.githubId }, jwtSecret, { expiresIn: '7d' });
        res.json({ token: sessionToken, user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl } });
    }
    catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
// GitHub Webhook Endpoint
app.post('/api/webhooks/github', async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    console.log(`Received GitHub event: ${event}`);
    if (event) {
        const { githubEventQueue } = await Promise.resolve().then(() => __importStar(require('./queue')));
        await githubEventQueue.add('process-event', { event, payload });
    }
    res.status(200).send({ status: 'queued' });
});
// Dashboard Metrics Endpoint
app.get('/api/metrics/dashboard', async (req, res) => {
    try {
        const { analyzeProjectHealth } = await Promise.resolve().then(() => __importStar(require('./analyzer')));
        // Find first repo for demo purposes
        const repo = await prisma_1.prisma.repository.findFirst();
        let advancedStats = null;
        if (repo) {
            advancedStats = await analyzeProjectHealth(repo.id);
        }
        const metrics = await prisma_1.prisma.dailyDeveloperMetric.findMany({
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
    }
    catch (error) {
        console.error('Metrics Error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// Forcibly keep the event loop alive (workaround for Windows Node.js exit issue)
setInterval(() => { }, 1000 * 60 * 60);
