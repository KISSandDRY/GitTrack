'use client';

import React, { useEffect, useState } from 'react';
import { User, ShieldAlert, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string, avatarUrl: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
    window.location.reload(); // Force full reload to reset AppShell state
  };

  const handleDeleteData = async () => {
    if (confirm('CRITICAL WARNING: Are you sure you want to completely erase all your tracked data? This cannot be undone.')) {
      const token = localStorage.getItem('token');
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        await fetch(`${API_BASE_URL}/api/users/me`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        handleSignOut();
      } catch (e) {
        alert('Failed to delete data');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight glow-text mb-2 text-white">
          Settings
        </h1>
        <p className="text-gray-400 text-lg">
          Manage your account and tracked data
        </p>
      </header>

      {/* Profile Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-2xl border border-white/5"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <User className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">GitHub Connection</h2>
        </div>

        <div className="flex items-center gap-6 p-6 rounded-xl bg-white/5 border border-white/5">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-800 animate-pulse" />
          )}
          
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">
              {user?.username || 'Loading...'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Connected via OAuth App (public_repo scope)
            </p>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </motion.section>

      {/* Danger Zone */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-8 rounded-2xl border border-red-500/20 bg-red-950/10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <ShieldAlert className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-400">Danger Zone</h2>
        </div>

        <div className="p-6 rounded-xl border border-red-500/20 bg-black/40">
          <h3 className="text-lg font-semibold text-white mb-2">Delete Account & Data</h3>
          <p className="text-gray-400 text-sm mb-6">
            This will permanently delete your user profile, all tracked repositories, commits, and metrics from the GitTrack database. It does NOT delete anything on GitHub.
          </p>
          <button 
            onClick={handleDeleteData}
            className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors font-medium"
          >
            Permanently Erase Data
          </button>
        </div>
      </motion.section>
    </div>
  );
}
