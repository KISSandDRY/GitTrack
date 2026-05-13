'use client';

import React from 'react';

export default function LoginScreen() {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      alert("Please configure NEXT_PUBLIC_GITHUB_CLIENT_ID in Vercel!");
      return;
    }
    const redirectUri = window.location.origin + '/auth/callback';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=public_repo`;
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#0A0A0B]">
      <div className="glass-panel p-10 rounded-3xl flex flex-col items-center text-center max-w-md w-full shadow-2xl shadow-indigo-500/10">
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight glow-text">GitTrack</h1>
        <p className="text-gray-400 mb-10">Advanced engineering metrics and workflow insights</p>
        <button 
          onClick={handleLogin}
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 text-lg"
        >
          <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          Continue with GitHub
        </button>
      </div>
    </main>
  );
}
