import React, { useState, useMemo } from 'react';

import { useData } from '../context/DataContext';
import { Flame, Award, Bot, ArrowRight } from 'lucide-react';

interface DepartmentsViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const DEPARTMENT_GROUP_META: Record<string, { icon: string }> = {
  Engineering: { icon: '⚙' },
  Science: { icon: '◈' },
  Business: { icon: '৳' },
  Arts: { icon: '✦' },
  Law: { icon: '§' },
  Health: { icon: '✚' },
  Agriculture: { icon: '♧' },
};

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({ onNavigate }) => {
  const { news, departments } = useData();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');

  // Hot topics and prize winners across all departments
  const departmentHighlights = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED' && (n.isHotTopic || n.alumniPrizeName))
      .slice(0, 3);
  }, [news]);

  // Filter departments
  const filtered = useMemo(() => {
    return departments.filter((d) => d.verified === true).filter((d) => {
      const matchesGroup = group === 'All' || d.group === group;
      const hay = [d.name, d.group].join(' ').toLowerCase();
      const matchesSearch = !search || hay.includes(search.trim().toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [departments, search, group]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-5 py-7 sm:py-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Department Directory
          </div>
          <h1 className="text-2xl sm:text-4xl font-black navy mt-2">Explore by Department</h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Choose a department to see universities offering it, then explore department-wise batches,
            career distributions, and alumni outcomes across the network.
          </p>
        </div>
        <span className="pill text-blue-600 self-start lg:self-end">
          {filtered.length} departments cataloged
        </span>
      </div>

      {/* Highlights Radar across Departments */}
      {departmentHighlights.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-500 text-white rounded-lg animate-pulse">
                <Flame className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Department Alumni Achievements Radar
              </span>
            </div>
            <button
              onClick={() => onNavigate('news')}
              className="text-xs font-bold text-blue-300 hover:text-white transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Explore All Live News</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {departmentHighlights.map((art) => (
              <div
                key={art.id}
                onClick={() => onNavigate('newsDetail', { id: art.id })}
                className="bg-white/10 hover:bg-white/15 transition p-3 rounded-xl cursor-pointer border border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  {art.isHotTopic && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      Hot Topic
                    </span>
                  )}
                  {art.department && (
                    <span className="text-[10px] font-semibold text-blue-200 truncate">
                      {art.department}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2">{art.title}</h4>
                {art.alumniPrizeName && (
                  <p className="text-[11px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{art.alumniPrizeName}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Group Filter */}
      <div className="card p-5 mt-7">
        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-soft rounded-xl px-4 py-3 outline-none focus:border-blue-400 bg-white"
            placeholder="Search department — e.g. CSE, Pharmacy, Economics, Law..."
          />
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="border border-soft rounded-xl px-4 py-3 bg-white outline-none cursor-pointer"
          >
            <option value="All">All academic groups</option>
            <option value="Engineering">Engineering & Technology</option>
            <option value="Science">Science & Life Science</option>
            <option value="Business">Business & Economics</option>
            <option value="Arts">Arts & Social Science</option>
            <option value="Law">Law</option>
            <option value="Health">Health & Medical</option>
            <option value="Agriculture">Agriculture & Veterinary</option>
          </select>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-5 sm:mt-6">
        {filtered.map((d) => {
          const meta = DEPARTMENT_GROUP_META[d.group] || { icon: '•' };
          // Number of universities offering this department
          const uniCount = departments.filter((item) => item.name.toLowerCase() === d.name.toLowerCase()).length;

          return (
            <button
              key={d.name}
              onClick={() => onNavigate('departmentUniversities', { dept: d.name, group: d.group })}
              className="dept-card card p-4 sm:p-5 text-left group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black group-hover:scale-105 transition">
                  {meta.icon}
                </div>
                <span className="pill text-blue-600 bg-blue-50/50">{uniCount} universities</span>
              </div>
              <h3 className="font-black text-lg navy mt-4 group-hover:text-blue-600 transition leading-snug">
                {d.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{d.group}</p>
              <div className="line my-4"></div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>View offering universities</span>
                <span className="text-blue-600 font-bold group-hover:translate-x-1 transition">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
