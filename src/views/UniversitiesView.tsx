import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ALL_DIRECTORY_UNIVERSITIES, universityInitials, demoSeed } from '../data/initialData';
import { Flame, Award, ArrowRight, Bot, Sparkles } from 'lucide-react';

interface UniversitiesViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const UniversitiesView: React.FC<UniversitiesViewProps> = ({ onNavigate }) => {
  const { universities, news } = useData();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Public' | 'Private' | 'International'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'alumni'>('name');

  // Highlights of hot topics or alumni prize winners across universities
  const universityHighlights = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED' && (n.isHotTopic || n.alumniPrizeName))
      .slice(0, 3);
  }, [news]);

  // Merge full directory list with dynamic stored database universities
  const list = useMemo(() => {
    const dbMap = new Map(universities.map((u) => [u.name.toLowerCase(), u]));

    const combined = ALL_DIRECTORY_UNIVERSITIES.map((u) => {
      const match = dbMap.get(u.name.toLowerCase());
      if (match) {
        return match;
      }
      // Demo seed for statistics if not explicitly saved
      const seed = demoSeed('uni-' + u.name);
      return {
        id: 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        name: u.name,
        type: u.type,
        location: 'Bangladesh',
        verified: true,
        alumniCount: 700 + (seed % 3500),
        departmentCount: 30 + (seed % 20),
        employmentRate: 75 + (seed % 19),
      };
    });

    return combined.filter((u) => {
      const matchesType = typeFilter === 'All' || u.type === typeFilter;
      const matchesSearch = u.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesType && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'type') return (a.type + a.name).localeCompare(b.type + b.name);
      if (sortBy === 'alumni') return (b.alumniCount || 0) - (a.alumniCount || 0);
      return a.name.localeCompare(b.name);
    });
  }, [universities, search, typeFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
        UGC Directory
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black navy">Explore universities</h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            All universities in this directory are included as UGC-listed institutions. Live alumni,
            department networks, and employment outcome analytics are linked directly to each institution.
          </p>
        </div>
        <div className="pill text-blue-600 whitespace-nowrap self-start lg:self-end">
          {list.length} institutions shown
        </div>
      </div>

      {/* University Alumni Live Wire & Breakthroughs Radar */}
      {universityHighlights.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-500 text-white rounded-lg animate-pulse">
                <Flame className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Institutional Alumni Breakthroughs & Live Wire
              </span>
            </div>
            <button
              onClick={() => onNavigate('news')}
              className="text-xs font-bold text-blue-300 hover:text-white transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Explore Live News Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {universityHighlights.map((art) => (
              <div
                key={art.id}
                onClick={() => onNavigate('newsDetail', { id: art.id })}
                className="bg-white/10 hover:bg-white/15 transition p-3 rounded-xl cursor-pointer border border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  {art.isHotTopic && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      Hot Topic
                    </span>
                  )}
                  {art.university && (
                    <span className="text-[10px] font-semibold text-blue-200 truncate">
                      {art.university}
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

      {/* Filter Card */}
      <div className="card p-5 mt-7">
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 border border-soft rounded-xl px-4 py-3 outline-none focus:border-blue-400 bg-white"
            placeholder="Search university name — e.g. Dhaka, BUET, Chittagong, NSU, Rajshahi..."
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border border-soft rounded-xl px-4 py-3 bg-white outline-none cursor-pointer"
          >
            <option value="All">All types</option>
            <option value="Public">Public (59)</option>
            <option value="Private">Private (116)</option>
            <option value="International">International (3)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-soft rounded-xl px-4 py-3 bg-white outline-none cursor-pointer"
          >
            <option value="name">Name A–Z</option>
            <option value="alumni">Most Alumni</option>
            <option value="type">By Type</option>
          </select>
        </div>
      </div>

      {/* Pill summary */}
      <div className="flex flex-wrap gap-2 mt-5 text-xs">
        <span className="pill">59 Public</span>
        <span className="pill">116 Private</span>
        <span className="pill">3 International</span>
        <span className="pill text-emerald-600">✓ UGC-listed</span>
      </div>

      {/* Universities Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {list.map((u) => {
          const initials = universityInitials(u.name);

          return (
            <button
              key={u.id || u.name}
              onClick={() => onNavigate('universityDetail', { name: u.name })}
              className="card p-5 text-left hover:-translate-y-1 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center font-black navy text-sm group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <b className="leading-snug text-slate-900 group-hover:text-blue-600 transition">
                        {u.name}
                      </b>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                        {u.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{u.location || 'Bangladesh'}</p>
                  </div>
                </div>

                <div className="line my-4"></div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Alumni</span>
                    <b className="navy text-sm">{u.alumniCount?.toLocaleString() || '1,200'}</b>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Employment</span>
                    <b className="text-emerald-600 text-sm">{u.employmentRate || 84}%</b>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-soft flex items-center justify-between text-xs">
                <span
                  className={`pill text-[11px] py-0.5 px-2.5 ${
                    u.type === 'Public'
                      ? 'text-blue-600 bg-blue-50/50'
                      : u.type === 'Private'
                      ? 'text-slate-600'
                      : 'text-emerald-600 bg-emerald-50/50'
                  }`}
                >
                  {u.type}
                </span>
                <span className="font-bold text-blue-600 group-hover:translate-x-1 transition">
                  View profile →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
