"use client";

import React from 'react';
import StatCard from './StatCard';
import ActivityChart from './ActivityChart';
import { GitCommit, GitPullRequest, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [metrics, setMetrics] = React.useState<any>(null);
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
      fetch(`${API_BASE_URL}/api/metrics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to connect to backend API');
          return res.json();
        })
        .then(data => setMetrics(data))
        .catch(err => {
          console.error(err);
          setError(err.message);
        });
    };

    fetchMetrics(); // Initial fetch

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
    </div>
  );
}
