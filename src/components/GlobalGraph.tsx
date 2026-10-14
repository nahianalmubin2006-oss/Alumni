import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Globe, Building2, Briefcase, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';

interface GlobalGraphProps {
  onNavigate?: (page: string, params?: Record<string, string>) => void;
}

interface HubNode {
  id: string;
  name: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  category: 'university' | 'company' | 'chapter' | 'research';
  alumniCount: string;
  subtitle: string;
  filterKey?: string;
}

export const GlobalGraph: React.FC<GlobalGraphProps> = ({ onNavigate }) => {
  const { stats, alumni } = useData();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TECH' | 'EUROPE' | 'RESEARCH'>('ALL');
  const [selectedHub, setSelectedHub] = useState<HubNode | null>(null);

  // Nodes definition
  const nodes: HubNode[] = [
    {
      id: 'du-cse',
      name: 'University of Dhaka',
      cx: 300,
      cy: 85,
      r: 15,
      color: '#2563eb',
      category: 'university',
      alumniCount: '75+ Verified',
      subtitle: 'CSE Founding pioneer cohort 1994 → 2029',
      filterKey: 'University of Dhaka',
    },
    {
      id: 'google-eu',
      name: 'Google & Tech Labs',
      cx: 505,
      cy: 115,
      r: 12,
      color: '#4f46e5',
      category: 'company',
      alumniCount: '40+ Engineers',
      subtitle: 'Munich, Zurich, London & Mountain View',
      filterKey: 'Google',
    },
    {
      id: 'buet-hub',
      name: 'BUET & Engineering Hub',
      cx: 80,
      cy: 280,
      r: 12,
      color: '#059669',
      category: 'university',
      alumniCount: '120+ Placements',
      subtitle: 'Distributed Systems & Robotics Chapters',
      filterKey: 'BUET',
    },
    {
      id: 'europe-chap',
      name: 'European Alumni Chapter',
      cx: 130,
      cy: 80,
      r: 10,
      color: '#0891b2',
      category: 'chapter',
      alumniCount: '35+ Scholars',
      subtitle: 'Germany, Switzerland, Sweden & UK',
      filterKey: 'Germany',
    },
    {
      id: 'research-hub',
      name: 'Doctoral & Research Fellows',
      cx: 335,
      cy: 220,
      r: 11,
      color: '#7c3aed',
      category: 'research',
      alumniCount: '28+ PhD / Postdoc',
      subtitle: 'Max Planck, NUS, Cambridge & Tokyo',
      filterKey: 'PhD',
    },
    {
      id: 'pacific-chap',
      name: 'North America Network',
      cx: 520,
      cy: 285,
      r: 10,
      color: '#d97706',
      category: 'chapter',
      alumniCount: '65+ Leaders',
      subtitle: 'Seattle, Silicon Valley, Austin & Toronto',
      filterKey: 'USA',
    },
  ];

  // Satellite smaller dots for realistic graph feel
  const satellites = [
    { cx: 170, cy: 160, r: 5, label: 'Singapore' },
    { cx: 230, cy: 180, r: 5, label: 'Sydney' },
    { cx: 410, cy: 260, r: 5, label: 'Tokyo' },
    { cx: 455, cy: 210, r: 5, label: 'Meta' },
    { cx: 210, cy: 70, r: 4, label: 'UK' },
    { cx: 380, cy: 130, r: 4, label: 'AWS' },
  ];

  const handleNodeClick = (hub: HubNode) => {
    setSelectedHub((prev) => (prev?.id === hub.id ? null : hub));
  };

  const handleInspectHub = (hub: HubNode) => {
    if (onNavigate && hub.filterKey) {
      if (hub.category === 'university') {
        onNavigate('universityDetail', { name: hub.filterKey });
      } else {
        onNavigate('search', { query: hub.filterKey });
      }
    }
  };

  return (
    <div className="card p-5 bg-white/95 dark:bg-slate-900 border-soft dark:border-slate-800 shadow-xl relative overflow-hidden transition-all duration-200">
      {/* Header and Interactive Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold navy dark:text-white text-sm">Global Alumni Network</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
          </div>
          <div className="text-[11px] text-slate-400">Interactive live intelligence graph · Click any hub</div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold self-start sm:self-center">
          <button
            type="button"
            onClick={() => { setActiveFilter('ALL'); setSelectedHub(null); }}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Hubs
          </button>
          <button
            type="button"
            onClick={() => { setActiveFilter('TECH'); setSelectedHub(nodes[1]); }}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeFilter === 'TECH'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tech
          </button>
          <button
            type="button"
            onClick={() => { setActiveFilter('EUROPE'); setSelectedHub(nodes[3]); }}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeFilter === 'EUROPE'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Europe
          </button>
          <button
            type="button"
            onClick={() => { setActiveFilter('RESEARCH'); setSelectedHub(nodes[4]); }}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeFilter === 'RESEARCH'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Research
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative">
        <svg viewBox="0 0 560 380" className="w-full h-auto drop-shadow-sm select-none">
          {/* Background Connecting Pathways with Animated Pulses */}
          <g stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 3" className="opacity-60 dark:stroke-slate-700">
            <path d="M55 105 C170 25 250 150 300 85 S430 45 505 115" fill="none" />
            <path d="M80 280 C180 190 250 315 335 220 S455 210 520 285" fill="none" />
            <path d="M130 80 C170 210 230 180 300 85" fill="none" />
            <path d="M300 85 C340 165 410 150 505 115" fill="none" />
            <path d="M300 85 C300 180 335 220 335 220" fill="none" />
            <path d="M335 220 C410 260 455 210 520 285" fill="none" />
            <path d="M80 280 C130 190 130 80 130 80" fill="none" />
            <path d="M505 115 C480 200 520 285 520 285" fill="none" />
          </g>

          {/* Satellite minor nodes */}
          <g fill="#94a3b8" className="dark:fill-slate-600">
            {satellites.map((s, idx) => (
              <circle key={idx} cx={s.cx} cy={s.cy} r={s.r} className="transition-all hover:scale-150" />
            ))}
          </g>

          {/* Interactive Hub Nodes */}
          {nodes.map((hub) => {
            const isSelected = selectedHub?.id === hub.id;
            return (
              <g
                key={hub.id}
                onClick={() => handleNodeClick(hub)}
                className="cursor-pointer group"
              >
                {/* Outer Glow Ring on selected or hover */}
                <circle
                  cx={hub.cx}
                  cy={hub.cy}
                  r={isSelected ? hub.r + 9 : hub.r + 5}
                  fill={hub.color}
                  opacity={isSelected ? 0.35 : 0.15}
                  className="transition-all duration-300 group-hover:opacity-40 animate-pulse"
                />

                {/* Core Hub Circle */}
                <circle
                  cx={hub.cx}
                  cy={hub.cy}
                  r={isSelected ? hub.r + 2 : hub.r}
                  fill={hub.color}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-300 group-hover:scale-115 drop-shadow-md"
                />

                {/* Node Label Text */}
                <text
                  x={hub.cx}
                  y={hub.cy + hub.r + 15}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="10"
                  fontWeight="700"
                  fill={isSelected ? '#2563eb' : '#475569'}
                  className="dark:fill-slate-300 transition-colors pointer-events-none select-none"
                >
                  {hub.name.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Live Interactive Hub Inspector Popover */}
        {selectedHub && (
          <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3.5 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-20">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  {selectedHub.category === 'university'
                    ? 'Academic Epicenter'
                    : selectedHub.category === 'company'
                    ? 'Industry Destination'
                    : selectedHub.category === 'research'
                    ? 'Fellowship & Research'
                    : 'Global Diaspora Chapter'}
                </span>
                <b className="navy dark:text-white text-xs sm:text-sm block leading-snug mt-0.5">
                  {selectedHub.name}
                </b>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHub(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                aria-label="Close inspector"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {selectedHub.subtitle}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                {selectedHub.alumniCount}
              </span>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => handleInspectHub(selectedHub)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Hub</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Metrics Bar */}
      <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="metric p-2.5 rounded-xl border border-soft dark:border-slate-800 text-center sm:text-left bg-slate-50/60 dark:bg-slate-800/40">
          <div className="text-lg font-black navy dark:text-white">{stats.totalUniversities}</div>
          <div className="text-[10px] text-slate-400">Institutions</div>
        </div>
        <div className="metric p-2.5 rounded-xl border border-soft dark:border-slate-800 text-center sm:text-left bg-slate-50/60 dark:bg-slate-800/40">
          <div className="text-lg font-black navy dark:text-white">
            {stats.totalAlumni > 999
              ? `${(stats.totalAlumni / 1000).toFixed(1)}K`
              : stats.totalAlumni}
          </div>
          <div className="text-[10px] text-slate-400">Tracked Alumni</div>
        </div>
        <div className="metric p-2.5 rounded-xl border border-soft dark:border-slate-800 text-center sm:text-left bg-slate-50/60 dark:bg-slate-800/40">
          <div className="text-lg font-black navy dark:text-white">{stats.totalCountries}</div>
          <div className="text-[10px] text-slate-400">Countries</div>
        </div>
      </div>
    </div>
  );
};
