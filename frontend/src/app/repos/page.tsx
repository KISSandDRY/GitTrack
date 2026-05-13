'use client';

import React, { useEffect, useState } from 'react';
import { BookMarked, GitCommit, GitPullRequest, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Repo {
  id: string;
  name: string;
  updatedAt: string;
  commitCount: number;
  prCount: number;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        const res = await fetch(`${API_BASE_URL}/api/repos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setRepos(data);
        }
      } catch (err) {
        console.error("Failed to fetch repos", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight glow-text mb-2 text-white">
          Repositories
        </h1>
        <p className="text-gray-400 text-lg">
          Your active projects currently being tracked
        </p>
      </header>

      {loading ? (
        <div className="text-gray-400 animate-pulse">Loading repositories...</div>
      ) : repos.length === 0 ? (
        <div className="glass-panel p-10 text-center rounded-xl border border-white/5">
          <BookMarked className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No Repositories Found</h3>
          <p className="text-gray-400">Push some code to a public repository to see it here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {repos.map((repo, i) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                    {repo.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Updated {new Date(repo.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <BookMarked size={20} className="text-indigo-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <GitCommit size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">Commits</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{repo.commitCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <GitPullRequest size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">PRs</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{repo.prCount}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
