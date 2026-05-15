'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Clock, Award, ShieldAlert, GitMerge } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis
} from 'recharts';

interface BehaviorMetrics {
  timeDistribution: { name: string, value: number }[];
  etiquette: { score: number, good: number, bad: number };
  consistency: { score: number, burnoutRisk: string, stdDev: number };
  impact: { avgLinesPerCommit: number, coderType: string };
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<BehaviorMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBehaviorMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        const res = await fetch(`${API_BASE_URL}/api/metrics/behavior`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch behavior metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBehaviorMetrics();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-200 animate-pulse font-medium">Crunching behavioral data...</p>
      </div>
    );
  }

  if (!metrics) return <div className="text-red-400 p-10">Failed to load analytics</div>;

  const getPersona = () => {
    const max = [...metrics.timeDistribution].sort((a, b) => b.value - a.value)[0];
    if (max.value === 0) return { title: 'Unknown', desc: 'Not enough data' };
    switch (max.name) {
      case 'Morning': return { title: 'Morning Bird', desc: 'You write your best code before lunch.' };
      case 'Afternoon': return { title: 'Afternoon Hustler', desc: 'You peak during standard working hours.' };
      case 'Evening': return { title: 'Evening Dev', desc: 'You code while the sun goes down.' };
      case 'Night': return { title: 'Night Owl', desc: 'The darker it gets, the harder you code.' };
      default: return { title: 'Balanced', desc: 'You code consistently all day.' };
    }
  };

  const persona = getPersona();
  const PIE_COLORS = ['#6366f1', '#ef4444']; // Indigo for Good, Red for Bad

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight glow-text mb-2 text-white">
          Behavioral Analytics
        </h1>
        <p className="text-gray-400 text-lg">
          Psychological insights into how, when, and why you code.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Developer Persona Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Developer Persona</h3>
              <p className="text-sm text-purple-300 font-medium">{persona.title} — <span className="text-gray-400 font-normal">{persona.desc}</span></p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] -ml-8">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics.timeDistribution}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#334155" tick={false} />
                <Radar name="Commits" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#c4b5fd' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 2. Etiquette Engine */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Award className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Commit Etiquette</h3>
              <p className="text-sm text-gray-400">Natural language analysis of your commit messages</p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Descriptive', value: metrics.etiquette.good || 1 }, // fallback to 1 to show ring if empty
                      { name: 'Lazy/Short', value: metrics.etiquette.bad }
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none"
                  >
                    {PIE_COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={metrics.etiquette.good === 0 && metrics.etiquette.bad === 0 ? '#334155' : color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center min-w-[120px]">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Score</p>
                <p className={`text-4xl font-bold ${metrics.etiquette.score >= 80 ? 'text-green-400' : metrics.etiquette.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.etiquette.score}
                </p>
              </div>
              <p className="text-xs text-gray-500 max-w-[150px] leading-relaxed">
                Scores &gt;80 indicate highly professional, descriptive commit history.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. Consistency vs Crunch Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <ShieldAlert className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Consistency Index</h3>
              <p className="text-sm text-gray-400">Statistical variance over the last 30 days</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-8">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-300 font-medium">Consistency Score</span>
                <span className="text-2xl font-bold text-white">{metrics.consistency.score}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${metrics.consistency.score}%` }}></div>
              </div>
            </div>

            <div className={`p-5 rounded-xl border ${metrics.consistency.burnoutRisk === 'High' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                Burnout Risk: <span className={metrics.consistency.burnoutRisk === 'High' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{metrics.consistency.burnoutRisk}</span>
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {metrics.consistency.burnoutRisk === 'High' 
                  ? "Your commit standard deviation is very high. You are doing 'Crunch Time' bursts of coding. Try to space out your work to prevent burnout!" 
                  : "You maintain a steady, healthy pace of commits without extreme peaks or valleys."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 4. Impact vs Noise */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <GitMerge className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Impact Analysis</h3>
              <p className="text-sm text-gray-400">Lines changed per commit ratio</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl font-extrabold text-emerald-400 mb-2">{metrics.impact.avgLinesPerCommit}</div>
            <p className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-6">Avg Lines Changed per Commit</p>
            
            <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 shadow-inner">
              <span className="text-white font-medium">Style: </span>
              <span className="text-emerald-300">{metrics.impact.coderType}</span>
            </div>
            <p className="text-xs text-gray-500 mt-4 max-w-[250px]">
              {metrics.impact.coderType === 'Bulk Coder' ? 'You make massive, sweeping commits. Consider breaking them down for easier code reviews.' : 
               metrics.impact.coderType === 'Noisy Coder' ? 'You commit very frequently with tiny changes. This might clutter the git log.' : 
               'You make well-sized, iterative commits that are easy to review.'}
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
