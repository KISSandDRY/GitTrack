"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof LucideIcon;
  trend?: number;
  trendLabel?: string;
  delay?: number;
}

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, delay = 0 }: StatCardProps) {
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-[var(--color-primary)] transition-colors duration-300"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
        <Icon size={80} />
      </div>
      
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-[var(--color-primary-glow)] rounded-lg">
          <Icon size={20} className="text-[var(--color-primary)]" />
        </div>
        <h3 className="text-gray-400 font-medium text-sm">{title}</h3>
      </div>
      
      <div className="flex items-end space-x-4">
        <h2 className="text-4xl font-bold text-white tracking-tight">{value}</h2>
        
        {trend !== undefined && (
          <div className="flex items-center pb-1">
            <span
              className={`text-sm font-semibold flex items-center ${
                isPositiveTrend ? 'text-green-400' : isNegativeTrend ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {isPositiveTrend ? '↑' : isNegativeTrend ? '↓' : '-'}
              {Math.abs(trend)}%
            </span>
            {trendLabel && (
              <span className="text-xs text-gray-500 ml-2">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
