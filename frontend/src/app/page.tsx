'use client';
import React from 'react';
import Dashboard from '../components/Dashboard';

export default function Home() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight glow-text mb-2 text-white">
          Developer Project Tracker
        </h1>
        <p className="text-gray-400 text-lg">
          Advanced engineering metrics and workflow insights
        </p>
      </header>

      <Dashboard />
    </div>
  );
}
