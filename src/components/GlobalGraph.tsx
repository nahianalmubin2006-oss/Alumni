import React from 'react';
import { useData } from '../context/DataContext';

export const GlobalGraph: React.FC = () => {
  const { stats } = useData();

  return (
    <div className="card p-5 bg-white/90 shadow-xl border-soft">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold navy">Global alumni network</div>
          <div className="text-xs text-slate-400">Live intelligence graph</div>
        </div>
        <span className="pill text-blue-600 bg-blue-50/60 border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          Live graph
        </span>
      </div>

      <svg viewBox="0 0 560 390" className="w-full h-auto drop-shadow-sm select-none">
        <path
          d="M55 105 C170 25 250 150 300 85 S430 45 505 115 M80 280 C180 190 250 315 335 220 S455 210 520 285 M130 80 C170 210 230 180 300 85 M300 85 C340 165 410 150 505 115 M300 85 C300 180 335 220 335 220 M335 220 C410 260 455 210 520 285"
          fill="none"
          stroke="#d7e5fa"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />

        {/* Primary nodes */}
        <g fill="#1254c7">
          <circle cx="300" cy="85" r="14" className="transition duration-300 hover:scale-125" />
          <circle cx="80" cy="280" r="10" />
          <circle cx="505" cy="115" r="10" />
        </g>

        {/* Secondary hubs */}
        <g fill="#10b981">
          <circle cx="130" cy="80" r="8" />
          <circle cx="335" cy="220" r="9" />
          <circle cx="520" cy="285" r="8" />
        </g>

        {/* Satellite dots */}
        <g fill="#94a3b8">
          <circle cx="170" cy="160" r="6" />
          <circle cx="230" cy="180" r="6" />
          <circle cx="410" cy="260" r="6" />
          <circle cx="455" cy="210" r="6" />
        </g>

        {/* Labels */}
        <g fontFamily="Inter" fontSize="11" fontWeight="600" fill="#475569">
          <text x="268" y="52">University</text>
          <text x="35" y="310">Alumni</text>
          <text x="475" y="92">Companies</text>
          <text x="330" y="248">Countries</text>
        </g>
      </svg>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="metric p-3 rounded-xl border border-soft text-center sm:text-left">
          <div className="text-xl font-black navy">{stats.totalUniversities}</div>
          <div className="text-[11px] text-slate-400">Universities</div>
        </div>
        <div className="metric p-3 rounded-xl border border-soft text-center sm:text-left">
          <div className="text-xl font-black navy">
            {stats.totalAlumni > 999
              ? `${(stats.totalAlumni / 1000).toFixed(1)}K`
              : stats.totalAlumni}
          </div>
          <div className="text-[11px] text-slate-400">Alumni</div>
        </div>
        <div className="metric p-3 rounded-xl border border-soft text-center sm:text-left">
          <div className="text-xl font-black navy">{stats.totalCountries}</div>
          <div className="text-[11px] text-slate-400">Countries</div>
        </div>
      </div>
    </div>
  );
};
