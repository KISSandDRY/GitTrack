'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvancedMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        const res = await fetch(`${API_BASE_URL}/api/metrics/advanced`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch advanced metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvancedMetrics();
  }, []);

  const getHeatmapColor = (commits: number) => {
    if (commits === 0) return 'bg-white/5 border-white/5';
    if (commits <= 2) return 'bg-indigo-900/50 border-indigo-800/50';
    if (commits <= 5) return 'bg-indigo-600/60 border-indigo-500/50';
    if (commits <= 10) return 'bg-indigo-500 border-indigo-400';
    return 'bg-indigo-400 border-indigo-300 shadow-[0_0_10px_rgba(129,140,248,0.5)]';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight glow-text mb-2 text-white">
          Advanced Analytics
        </h1>
        <p className="text-gray-400 text-lg">
          Deep insights into your coding patterns
        </p>
      </header>

      {loading ? (
        <div className="text-gray-400 animate-pulse">Loading analytics...</div>
      ) : !metrics ? (
        <div className="text-red-400">Failed to load analytics</div>
      ) : (
        <div className="space-y-8">
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
              {metrics.heatmap.map((day, i) => (
                <div 
                  key={i} 
                  className={`w-12 h-12 rounded-md border flex items-center justify-center transition-all hover:scale-110 cursor-help ${getHeatmapColor(day.commits)}`}
                  title={`${day.commits} commits on ${day.date}`}
                >
                  {day.commits > 0 && <span className="text-xs font-bold text-white/90">{day.commits}</span>}
                </div>
              ))}
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
                    <span className="text-2xl font-bold text-white">{metrics.codeChurn.additions.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ 
                        width: `${metrics.codeChurn.additions + metrics.codeChurn.deletions > 0 
                          ? (metrics.codeChurn.additions / (metrics.codeChurn.additions + metrics.codeChurn.deletions)) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-red-400 flex items-center gap-1 font-medium"><ArrowDownRight size={16}/> Deletions</span>
                    <span className="text-2xl font-bold text-white">{metrics.codeChurn.deletions.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ 
                        width: `${metrics.codeChurn.additions + metrics.codeChurn.deletions > 0 
                          ? (metrics.codeChurn.deletions / (metrics.codeChurn.additions + metrics.codeChurn.deletions)) * 100 
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
                  {metrics.codeChurn.additions > metrics.codeChurn.deletions * 3 
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
