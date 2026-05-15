"use client";

import React from 'react';
import StatCard from './StatCard';
import ActivityChart from './ActivityChart';
import { GitCommit, GitPullRequest, Clock, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeatmapDay {
  date: string;
  commits: number;
}

interface AdvancedMetrics {
  heatmap: HeatmapDay[];
  codeChurn: {
    additions: number;
    deletions: number;
  };
}

export default function Dashboard() {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [advancedMetrics, setAdvancedMetrics] = React.useState<AdvancedMetrics | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showSyncBanner, setShowSyncBanner] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSyncBanner(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchMetrics = () => {
      const token = localStorage.getItem('token');
      
      Promise.all([
        fetch(`${API_BASE_URL}/api/metrics/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
        fetch(`${API_BASE_URL}/api/metrics/advanced`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
      ]).then(([dashboardData, advancedData]) => {
        if (dashboardData.error) throw new Error(dashboardData.error);
        setMetrics(dashboardData);
        setAdvancedMetrics(advancedData);
      }).catch(err => {
        console.error(err);
        setError(err.message || 'Failed to connect to backend API');
      });
    };

    fetchMetrics(); // Initial fetch

    // Trigger a background sync on mount to catch any commits from non-webhook repos
    fetch(`${API_BASE_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).catch(console.error);

    // Listen for Server-Sent Events (SSE) from the backend
    const eventSource = new EventSource(`${API_BASE_URL}/api/metrics/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.event === 'sync-complete') {
          console.log('Background sync completed! Automatically fetching fresh data...');
          setShowSyncBanner(false);
          fetchMetrics();
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (error) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-red-500/30 bg-red-900/10">
        <h3 className="text-red-400 font-semibold mb-2">Dashboard Error</h3>
        <p className="text-red-200/70">{error}</p>
        <p className="text-sm mt-4 text-gray-400">Make sure the backend server is running on port 3001.</p>
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-gray-400 animate-pulse">Loading metrics...</div>;
  }

  return (
    <div className="space-y-8">
      {metrics.totalCommits === 0 && showSyncBanner && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-xl border border-indigo-500/30 bg-indigo-900/20 flex items-center justify-between"
        >
          <div>
            <h3 className="text-indigo-300 font-semibold text-lg flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing Historical Data
            </h3>
            <p className="text-indigo-200/70 mt-1">
              We are importing your past repositories and commits in the background. Your dashboard will automatically update in a few moments!
            </p>
          </div>
        </motion.div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Commits"
          value={metrics.totalCommits.toLocaleString()}
          icon={GitCommit}
          trend={metrics.commitsTrend || 0}
          trendLabel="vs last week"
          delay={0.1}
        />
        <StatCard
          title="Merged PRs"
          value={metrics.mergedPrs.toLocaleString()}
          icon={GitPullRequest}
          trend={0}
          trendLabel="vs last week"
          delay={0.2}
        />
        <StatCard
          title="Avg PR Latency"
          value={metrics.avgPrLatency}
          icon={Clock}
          trend={0}
          trendLabel="faster than avg"
          delay={0.3}
        />
        <StatCard
          title="Risk Score"
          value={metrics.riskScore}
          icon={AlertTriangle}
          delay={0.4}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ActivityChart data={metrics.activityPulse} />
        </div>

        {/* Smart Insights Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glass-panel p-6 rounded-2xl flex flex-col h-full"
        >
          <h3 className="text-xl font-semibold text-white mb-6">Smart Insights</h3>

          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-xl bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <h4 className="font-medium text-blue-100">Peak Productivity</h4>
              </div>
              <p className="text-sm text-blue-200/80">
                {metrics.totalCommits === 0
                  ? 'Waiting for your first commit to analyze productivity patterns.'
                  : `You are most active on ${metrics.advancedStats.peakProductivityDay}s compared to other days.`}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${metrics.totalCommits === 0 ? 'bg-[rgba(156,163,175,0.1)] border-[rgba(156,163,175,0.2)]' : metrics.advancedStats.hasLongPrs ? 'bg-[rgba(236,72,153,0.1)] border-[rgba(236,72,153,0.2)]' : 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${metrics.totalCommits === 0 ? 'bg-gray-400' : metrics.advancedStats.hasLongPrs ? 'bg-pink-400' : 'bg-green-400'}`}></div>
                <h4 className={`font-medium ${metrics.totalCommits === 0 ? 'text-gray-300' : metrics.advancedStats.hasLongPrs ? 'text-pink-100' : 'text-green-100'}`}>PR Bottleneck</h4>
              </div>
              <p className={`text-sm ${metrics.totalCommits === 0 ? 'text-gray-400' : metrics.advancedStats.hasLongPrs ? 'text-pink-200/80' : 'text-green-200/80'}`}>
                {metrics.mergedPrs === 0
                  ? 'Open and merge a Pull Request to track review latency.'
                  : metrics.advancedStats.hasLongPrs
                    ? 'Your latest PRs are taking longer to review. Consider breaking them into smaller chunks.'
                    : 'Your PR review times are healthy and within the normal range.'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${metrics.totalCommits === 0 ? 'bg-[rgba(156,163,175,0.1)] border-[rgba(156,163,175,0.2)]' : metrics.advancedStats.isDecaying ? 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]' : 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${metrics.totalCommits === 0 ? 'bg-gray-400' : metrics.advancedStats.isDecaying ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                <h4 className={`font-medium ${metrics.totalCommits === 0 ? 'text-gray-300' : metrics.advancedStats.isDecaying ? 'text-yellow-100' : 'text-green-100'}`}>Consistency Score</h4>
              </div>
              <p className={`text-sm ${metrics.totalCommits === 0 ? 'text-gray-400' : metrics.advancedStats.isDecaying ? 'text-yellow-200/80' : 'text-green-200/80'}`}>
                {metrics.totalCommits === 0
                  ? 'Push some code to activate the Exponential Decay prediction model.'
                  : metrics.advancedStats.isDecaying
                    ? 'Warning: The prediction curve shows a decline in your commit frequency.'
                    : 'Excellent consistency this week! Your prediction curve shows steady growth.'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {advancedMetrics && (
        <div className="space-y-8 mt-8">
          {/* 30-Day Heatmap */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-2xl border border-white/5"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Activity className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">30-Day Contribution Heatmap</h3>
                <p className="text-sm text-gray-400">Your commit frequency over the last month</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {advancedMetrics.heatmap.map((day, i) => {
                let colorClass = 'bg-white/5 border-white/5';
                if (day.commits > 0 && day.commits <= 2) colorClass = 'bg-indigo-900/50 border-indigo-800/50';
                else if (day.commits > 2 && day.commits <= 5) colorClass = 'bg-indigo-600/60 border-indigo-500/50';
                else if (day.commits > 5 && day.commits <= 10) colorClass = 'bg-indigo-500 border-indigo-400';
                else if (day.commits > 10) colorClass = 'bg-indigo-400 border-indigo-300 shadow-[0_0_10px_rgba(129,140,248,0.5)]';

                return (
                  <div 
                    key={i} 
                    className={`w-12 h-12 rounded-md border flex items-center justify-center transition-all hover:scale-110 cursor-help ${colorClass}`}
                    title={`${day.commits} commits on ${day.date}`}
                  >
                    {day.commits > 0 && <span className="text-xs font-bold text-white/90">{day.commits}</span>}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 justify-end">
              <span>Less</span>
              <div className="w-4 h-4 rounded-sm bg-white/5 border border-white/5"></div>
              <div className="w-4 h-4 rounded-sm bg-indigo-900/50 border border-indigo-800/50"></div>
              <div className="w-4 h-4 rounded-sm bg-indigo-600/60 border border-indigo-500/50"></div>
              <div className="w-4 h-4 rounded-sm bg-indigo-500 border border-indigo-400"></div>
              <div className="w-4 h-4 rounded-sm bg-indigo-400 border border-indigo-300"></div>
              <span>More</span>
            </div>
          </motion.div>

          {/* Code Churn */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col justify-center">
              <h3 className="text-lg font-semibold text-white mb-6">Code Churn (Last 30 Days)</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-green-400 flex items-center gap-1 font-medium"><ArrowUpRight size={16}/> Additions</span>
                    <span className="text-2xl font-bold text-white">{advancedMetrics.codeChurn.additions.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ 
                        width: `${advancedMetrics.codeChurn.additions + advancedMetrics.codeChurn.deletions > 0 
                          ? (advancedMetrics.codeChurn.additions / (advancedMetrics.codeChurn.additions + advancedMetrics.codeChurn.deletions)) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-red-400 flex items-center gap-1 font-medium"><ArrowDownRight size={16}/> Deletions</span>
                    <span className="text-2xl font-bold text-white">{advancedMetrics.codeChurn.deletions.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ 
                        width: `${advancedMetrics.codeChurn.additions + advancedMetrics.codeChurn.deletions > 0 
                          ? (advancedMetrics.codeChurn.deletions / (advancedMetrics.codeChurn.additions + advancedMetrics.codeChurn.deletions)) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-900/10 to-transparent">
              <h3 className="text-lg font-semibold text-white mb-2">What does Churn mean?</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                High additions usually indicate new feature development, while high deletions often point to refactoring, cleaning up technical debt, or optimizing existing architecture.
              </p>
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-200 text-sm font-medium">
                  {advancedMetrics.codeChurn.additions > advancedMetrics.codeChurn.deletions * 3 
                    ? "You've been writing a lot of new code recently! Make sure to take time to refactor."
                    : "You have a healthy balance of writing new features and cleaning up old code."}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
