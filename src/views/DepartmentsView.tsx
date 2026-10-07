import React, { useState, useMemo } from 'react';
import { RAW_DEPARTMENT_CATALOG, ALL_DIRECTORY_UNIVERSITIES } from '../data/initialData';

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
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');

  // Filter departments
  const filtered = useMemo(() => {
    return RAW_DEPARTMENT_CATALOG.filter((d) => {
      const matchesGroup = group === 'All' || d.group === group;
      const hay = [d.name, d.group, ...d.aliases].join(' ').toLowerCase();
      const matchesSearch = !search || hay.includes(search.trim().toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [search, group]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Department Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">Explore by Department</h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Choose a department to see universities offering it, then explore department-wise batches,
            career distributions, and alumni outcomes across the network.
          </p>
        </div>
        <span className="pill text-blue-600 self-start lg:self-end">
          {filtered.length} departments cataloged
        </span>
      </div>

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
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {filtered.map((d) => {
          const meta = DEPARTMENT_GROUP_META[d.group] || { icon: '•' };
          // Number of universities offering this department
          const uniCount = d.name.includes('Computer Science')
            ? 178
            : d.group === 'Engineering'
            ? 65
            : d.group === 'Business'
            ? 120
            : d.group === 'Health'
            ? 35
            : 50;

          return (
            <button
              key={d.name}
              onClick={() => onNavigate('departmentUniversities', { dept: d.name, group: d.group })}
              className="dept-card card p-5 text-left group"
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
