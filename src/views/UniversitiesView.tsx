import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { University } from '../types';
import {
  ALL_DIRECTORY_UNIVERSITIES,
  universityInitials,
  getUniversityLogo,
} from '../data/initialData';
import { Flame, Award, ArrowRight, ArrowLeft, Bot, Sparkles, Users, GraduationCap, School, Heart, CheckCircle2 } from 'lucide-react';

interface UniversitiesViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const UniversitiesView: React.FC<UniversitiesViewProps> = ({ onNavigate, onBack }) => {
  const { universities, departments, alumni, students, news, toggleFollowUniversity, isFollowingUniversity } = useData();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Public' | 'Private' | 'International'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'alumni' | 'followers' | 'students'>('name');
  const [updateVersion, setUpdateVersion] = useState(0);

  useEffect(() => {
    const handler = () => setUpdateVersion((v) => v + 1);
    window.addEventListener('alumni-custom-logos-changed', handler);
    window.addEventListener('alumni-university-updated', handler);
    window.addEventListener('university-updated', handler);
    window.addEventListener('alumni-profile-updated', handler);
    window.addEventListener('alumni-directory-updated', handler);
    return () => {
      window.removeEventListener('alumni-custom-logos-changed', handler);
      window.removeEventListener('alumni-university-updated', handler);
      window.removeEventListener('university-updated', handler);
      window.removeEventListener('alumni-profile-updated', handler);
      window.removeEventListener('alumni-directory-updated', handler);
    };
  }, []);

  // Highlights of hot topics or alumni prize winners across universities
  const universityHighlights = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED' && (n.isHotTopic || n.alumniPrizeName))
      .slice(0, 3);
  }, [news]);

  // Featured shortcut universities
  const POPULAR_HUBS = [
    { label: 'University of Dhaka (DU)', query: 'Dhaka' },
    { label: 'BUET', query: 'Engineering & Technology' },
    { label: 'North South University', query: 'North South' },
    { label: 'Jahangirnagar University', query: 'Jahangirnagar' },
    { label: 'Rajshahi University', query: 'Rajshahi' },
    { label: 'BRAC University', query: 'BRAC' },
  ];

  // Merge full directory list with dynamic stored database universities
  const list = useMemo(() => {
    const uniMap = new Map<string, University>();

    // 1. Baseline UGC directory
    ALL_DIRECTORY_UNIVERSITIES.forEach((u) => {
      const id = 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      uniMap.set(u.name.toLowerCase(), {
        id,
        name: u.name,
        type: u.type,
        location: '',
        logoUrl: getUniversityLogo(u.name),
        status: 'Active',
        verified: false,
        followersCount: 0,
        departmentCount: 0,
        employmentRate: 0,
        higherStudiesRate: 0,
        countriesCount: 0,
        companiesCount: 0,
        alumniCount: 0,
        studentCount: 0,
      });
    });

    // 2. Database universities override or add new
    universities.forEach((u) => {
      const trimmedLower = (u.name || '').trim().toLowerCase();
      let key = trimmedLower;
      if (!uniMap.has(key)) {
        for (const [k, v] of uniMap.entries()) {
          if (v.id === u.id || v.name.toLowerCase() === trimmedLower) {
            key = k;
            break;
          }
        }
      }
      const existing = uniMap.get(key);
      const effectiveLogo = u.logoUrl || getUniversityLogo(u.name) || existing?.logoUrl || '';
      uniMap.set(key, {
        ...existing,
        ...u,
        id: u.id || existing?.id || 'uni-' + encodeURIComponent(trimmedLower.replace(/[^a-z0-9]/g, '-')),
        name: u.name || existing?.name || '',
        location: u.location !== undefined && u.location !== '' ? u.location : (existing?.location || ''),
        website: u.website !== undefined && u.website !== '' ? u.website : (existing?.website || ''),
        overview: u.overview !== undefined && u.overview !== '' ? u.overview : (existing?.overview || ''),
        logoUrl: effectiveLogo,
      });
    });

    // 2.5 LocalStorage custom universities cache
    try {
      const raw = localStorage.getItem('alumni_custom_universities');
      if (raw) {
        const customList: University[] = JSON.parse(raw);
        if (Array.isArray(customList)) {
          customList.forEach((u) => {
            const trimmedLower = (u.name || '').trim().toLowerCase();
            let key = trimmedLower;
            if (!uniMap.has(key)) {
              for (const [k, v] of uniMap.entries()) {
                if (v.id === u.id || v.name.toLowerCase() === trimmedLower) {
                  key = k;
                  break;
                }
              }
            }
            const existing = uniMap.get(key);
            const effectiveLogo = u.logoUrl || getUniversityLogo(u.name) || existing?.logoUrl || '';
            uniMap.set(key, {
              ...existing,
              ...u,
              id: u.id || existing?.id || 'uni-' + encodeURIComponent(trimmedLower.replace(/[^a-z0-9]/g, '-')),
              name: u.name || existing?.name || '',
              location: u.location !== undefined && u.location !== '' ? u.location : (existing?.location || ''),
              website: u.website !== undefined && u.website !== '' ? u.website : (existing?.website || ''),
              overview: u.overview !== undefined && u.overview !== '' ? u.overview : (existing?.overview || ''),
              logoUrl: effectiveLogo,
            });
          });
        }
      }
    } catch (e) {}

    // 3. Calculate live stats from real Firebase data for every active university
    const combined: University[] = Array.from(uniMap.values())
      .filter((u) => u.status !== 'Inactive')
      .map((u) => {
        const uName = (u.name || '').toLowerCase().trim();
        const liveAlumni = alumni.filter(
          (a) => a.status === 'APPROVED' && (a.university || '').toLowerCase().trim() === uName
        ).length;
        const liveStudents = students.filter(
          (s) => s.status === 'APPROVED' && (s.university || '').toLowerCase().trim() === uName
        ).length;
        const liveDepartments = departments.filter(
          (d) =>
            (d.university || '').toLowerCase().trim() === uName &&
            d.status !== 'Inactive' &&
            d.verified !== false
        ).length;

        const matchingAlumni = alumni.filter(
          (a) => a.status === 'APPROVED' && (a.university || '').toLowerCase().trim() === uName
        );
        const liveCountries = new Set(matchingAlumni.map((a) => a.country).filter(Boolean)).size;
        const liveCompanies = new Set(matchingAlumni.map((a) => a.company).filter(Boolean)).size;

        return {
          ...u,
          alumniCount: liveAlumni,
          studentCount: liveStudents,
          departmentCount: liveDepartments,
          countriesCount: liveCountries,
          companiesCount: liveCompanies,
        };
      });

    const q = search.trim().toLowerCase();

    return combined
      .filter((u) => {
        const matchesType = typeFilter === 'All' || u.type === typeFilter;
        if (!q) return matchesType;

        const isDU =
          u.name.toLowerCase().includes('dhaka') &&
          !u.name.toLowerCase().includes('engineering') &&
          !u.name.toLowerCase().includes('international') &&
          !u.name.toLowerCase().includes('central');

        const matchesSearch =
          u.name.toLowerCase().includes(q) ||
          (isDU &&
            (q === 'du' ||
              q.includes('dhaka') ||
              q.includes('varsity') ||
              q.includes('dhaka university') ||
              q.includes('university of dhaka'))) ||
          (q === 'buet' && u.name.toLowerCase().includes('engineering & technology')) ||
          (q === 'nsu' && u.name.toLowerCase().includes('north south')) ||
          (q === 'ru' && u.name.toLowerCase().includes('rajshahi')) ||
          (q === 'cu' && u.name.toLowerCase().includes('chittagong')) ||
          (q === 'ju' && u.name.toLowerCase().includes('jahangirnagar')) ||
          (q === 'brac' && u.name.toLowerCase().includes('brac')) ||
          q.split(/\s+/).every((word) => u.name.toLowerCase().includes(word));

        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'type') return (a.type + a.name).localeCompare(b.type + b.name);
        if (sortBy === 'alumni') return (b.alumniCount || 0) - (a.alumniCount || 0);
        if (sortBy === 'followers') return (b.followersCount || 0) - (a.followersCount || 0);
        if (sortBy === 'students') return (b.studentCount || 0) - (a.studentCount || 0);

        // Put University of Dhaka first if default A-Z sort to make it immediately accessible
        const aIsDU = a.name.toLowerCase().includes('university of dhaka');
        const bIsDU = b.name.toLowerCase().includes('university of dhaka');
        if (aIsDU && !bIsDU) return -1;
        if (!aIsDU && bIsDU) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [universities, departments, alumni, students, search, typeFilter, sortBy, updateVersion]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-5 py-7 sm:py-10">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('home'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Home</span>
        </button>
      </div>

      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
        UGC Official Directory
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black navy">Explore Universities</h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Browse verified UGC-recognized universities across Bangladesh. Connect with campus
            communities, follow your preferred institution, and explore distinctive alumni and
            student statistics.
          </p>
        </div>
        <div className="pill text-blue-600 whitespace-nowrap self-start lg:self-end">
          {list.length} institutions shown
        </div>
      </div>

      {/* Popular Shortcut University Hubs */}
      <div className="flex flex-wrap items-center gap-2 mt-5 text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">
          Quick Hubs:
        </span>
        {POPULAR_HUBS.map((hub) => (
          <button
            key={hub.label}
            onClick={() => setSearch(hub.query)}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer border ${
              search === hub.query
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {hub.label === 'University of Dhaka (DU)' && '⭐ '}
            {hub.label}
          </button>
        ))}
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-rose-600 font-bold hover:underline ml-1 cursor-pointer"
          >
            Clear filter ✕
          </button>
        )}
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
            {universityHighlights.map((art, idx) => (
              <div
                key={art.id || `uni-highlight-${idx}-${art.title}`}
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
      <div className="card p-4 sm:p-5 mt-5 sm:mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 border border-soft rounded-xl px-4 py-3 outline-none focus:border-blue-400 bg-white"
            placeholder="Search university name — e.g. Dhaka University, DU, BUET, NSU, Rajshahi..."
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border border-soft rounded-xl px-4 py-3 bg-white outline-none cursor-pointer"
          >
            <option value="All">All types (178)</option>
            <option value="Public">Public (59)</option>
            <option value="Private">Private (116)</option>
            <option value="International">International (3)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-soft rounded-xl px-4 py-3 bg-white outline-none cursor-pointer"
          >
            <option value="name">Recommended / Name A–Z</option>
            <option value="followers">Most Followed</option>
            <option value="alumni">Most Alumni</option>
            <option value="students">Most Enrolled Students</option>
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
        <span className="pill text-blue-600">👥 Live Follower Network</span>
      </div>

      {/* Universities Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 mt-5 sm:mt-6">
        {list.map((u) => {
          const initials = universityInitials(u.name);
          const logo = u.logoUrl || getUniversityLogo(u.name);
          const isFollowing = isFollowingUniversity(u.name);
          const isDU =
            u.name.toLowerCase().includes('dhaka') &&
            !u.name.toLowerCase().includes('engineering') &&
            !u.name.toLowerCase().includes('international') &&
            !u.name.toLowerCase().includes('central');

          return (
            <div
              key={u.id || u.name}
              onClick={() => onNavigate('universityDetail', { name: u.name })}
              className={`card p-5 text-left hover:-translate-y-1 transition duration-200 flex flex-col justify-between group cursor-pointer border ${
                isDU ? 'ring-2 ring-blue-500/30 border-blue-300/80 shadow-md' : 'border-soft'
              }`}
            >
              <div>
                {/* Header with Crest and Follow Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-white flex items-center justify-center font-black navy text-base group-hover:bg-blue-50 group-hover:text-blue-700 transition overflow-hidden p-1.5 border border-slate-200 shadow-xs">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${u.name} crest`}
                          className="w-full h-full object-contain hover:scale-105 transition"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <b className="leading-snug text-slate-900 group-hover:text-blue-600 transition text-sm">
                          {isDU ? 'University of Dhaka (DU)' : u.name}
                        </b>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                          {u.type}
                        </span>
                        {isDU && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded">
                            Est. 1921
                          </span>
                        )}
                        <span className="text-xs text-slate-400 truncate">
                          {u.location || 'Bangladesh'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!currentUser) {
                        onNavigate('account');
                        return;
                      }
                      toggleFollowUniversity(u.name);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isFollowing
                        ? 'bg-blue-600 text-white shadow-xs hover:bg-rose-600 hover:text-white'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                    title={isFollowing ? 'Click to unfollow' : 'Follow this university'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                </div>

                <div className="line my-4"></div>

                {/* 3 Distinct Numbers: Followers, Alumni, and Students */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-tight">
                      Followers
                    </span>
                    <b className="text-blue-600 text-sm block mt-0.5">
                      {u.followersCount?.toLocaleString() || '0'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-tight">
                      Alumni
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {u.alumniCount?.toLocaleString() || '0'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-tight">
                      Students
                    </span>
                    <b className="text-indigo-600 text-sm block mt-0.5">
                      {u.studentCount?.toLocaleString() || '0'}
                    </b>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-soft flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
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
                  <span className="text-[11px] text-emerald-600 font-bold">
                    {u.employmentRate ? `${u.employmentRate}% Employed` : 'Employment data unavailable'}
                  </span>
                </div>

                <span className="font-bold text-blue-600 group-hover:translate-x-1 transition flex items-center gap-1">
                  <span>Explore campus</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
