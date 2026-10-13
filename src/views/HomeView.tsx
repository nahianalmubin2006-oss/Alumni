import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { GlobalGraph } from '../components/GlobalGraph';
import { UniversityLogo } from '../components/UniversityLogo';
import { getUniversityLogo, ALL_DIRECTORY_UNIVERSITIES } from '../data/initialData';
import { VERIFIED_DEPARTMENT_SEEDS } from '../data/verifiedDepartments';
import { DU_CSE_BATCHES, DU_CSE_ANALYTICS } from '../data/duCseData';
import {
  Flame,
  Award,
  Bot,
  Clock,
  Shield,
  RefreshCw,
  Building2,
  BookOpen,
  GraduationCap,
  MapPin,
  Search,
  ChevronRight,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Globe,
  Briefcase,
  Users,
  TrendingUp,
  Compass,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { NewsArticle, University, AlumniRecord } from '../types';

interface HomeViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSearch: (query: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onSearch }) => {
  const { currentUser, userProfile } = useAuth();
  const { universities, departments, alumni, students, batches, news, triggerAINewsBotScan } = useData();
  const [searchInput, setSearchInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Real-time Universities & Logos section controls
  const [uniSearch, setUniSearch] = useState('');
  const [uniTypeFilter, setUniTypeFilter] = useState<'All' | 'Public' | 'Private' | 'International'>('All');
  const [selectedDeptGroup, setSelectedDeptGroup] = useState<string>('All');
  const [showAllUnis, setShowAllUnis] = useState(false);
  const [diasporaTab, setDiasporaTab] = useState<'EMPLOYERS' | 'COUNTRIES'>('EMPLOYERS');
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  const handleQuickSearch = (term: string) => {
    setSearchInput(term);
    onSearch(term);
  };

  // Merge directory baseline with live Firestore & server custom universities
  const masterUniversities = useMemo(() => {
    const uniMap = new Map<string, University>();

    // 1. Directory baseline
    ALL_DIRECTORY_UNIVERSITIES.forEach((u) => {
      const id = 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      uniMap.set(u.name.toLowerCase(), {
        id,
        name: u.name,
        type: u.type,
        location: 'Bangladesh',
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

    // 2. Override with live database universities
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
        location: u.location !== undefined && u.location !== '' ? u.location : (existing?.location || 'Bangladesh'),
        website: u.website !== undefined && u.website !== '' ? u.website : (existing?.website || ''),
        overview: u.overview !== undefined && u.overview !== '' ? u.overview : (existing?.overview || ''),
        logoUrl: effectiveLogo,
      });
    });

    // 3. Check LocalStorage custom universities cache
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
              location: u.location !== undefined && u.location !== '' ? u.location : (existing?.location || 'Bangladesh'),
              website: u.website !== undefined && u.website !== '' ? u.website : (existing?.website || ''),
              overview: u.overview !== undefined && u.overview !== '' ? u.overview : (existing?.overview || ''),
              logoUrl: effectiveLogo,
            });
          });
        }
      }
    } catch (e) {}

    return Array.from(uniMap.values()).filter((u) => u.status !== 'Inactive');
  }, [universities, updateVersion]);

  // Filtered universities for the live showcase
  const filteredShowcase = useMemo(() => {
    let list = masterUniversities;

    if (uniTypeFilter !== 'All') {
      list = list.filter((u) => u.type === uniTypeFilter);
    }

    if (selectedDeptGroup !== 'All') {
      list = list.filter((u) => {
        const uLower = (u.name || '').toLowerCase().trim();
        const uDepts = departments.filter((d) => (d.university || '').toLowerCase().trim() === uLower);
        const hasInGroup = uDepts.some((d) => d.group === selectedDeptGroup);
        if (hasInGroup) return true;
        return VERIFIED_DEPARTMENT_SEEDS.some(
          (s) => (s.university || '').toLowerCase().trim() === uLower && s.group === selectedDeptGroup
        );
      });
    }

    if (uniSearch.trim()) {
      const q = uniSearch.toLowerCase().trim();
      list = list.filter((u) => {
        const uLower = (u.name || '').toLowerCase().trim();
        const nameMatch = uLower.includes(q) || (u.shortName && u.shortName.toLowerCase().includes(q));
        const locMatch = u.location && u.location.toLowerCase().includes(q);
        const deptMatch = departments.some(
          (d) => (d.university || '').toLowerCase().trim() === uLower && (d.name || '').toLowerCase().includes(q)
        );
        return nameMatch || locMatch || deptMatch;
      });
    }

    return list;
  }, [masterUniversities, uniTypeFilter, selectedDeptGroup, uniSearch, departments]);

  // Discipline list for category filters
  const DISCIPLINE_PILLS = [
    { label: 'All Fields', value: 'All', icon: '✦' },
    { label: 'Engineering & Tech', value: 'Engineering', icon: '⚙' },
    { label: 'Sciences', value: 'Science', icon: '◈' },
    { label: 'Business & Management', value: 'Business', icon: '৳' },
    { label: 'Arts & Humanities', value: 'Arts', icon: '✦' },
    { label: 'Law & Justice', value: 'Law', icon: '§' },
    { label: 'Health & Medical', value: 'Health', icon: '✚' },
    { label: 'Agriculture & Life Sciences', value: 'Agriculture', icon: '♧' },
    { label: 'Other Disciplines', value: 'Other', icon: '★' },
  ];

  // Curated recent verified alumni sample for spotlight
  const featuredAlumniList = useMemo(() => {
    return alumni
      .filter((a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && a.company && a.jobRole)
      .slice(0, 6);
  }, [alumni]);

  // Top destinations from dataset
  const topEmployers = useMemo(() => {
    const counts = new Map<string, number>();
    alumni.forEach((a) => {
      if (a.company && a.company !== 'Unrecorded' && a.company !== 'Unknown') {
        counts.set(a.company, (counts.get(a.company) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [alumni]);

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    alumni.forEach((a) => {
      if (a.country && a.country !== 'Unrecorded' && a.country !== 'Unknown') {
        counts.set(a.country, (counts.get(a.country) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [alumni]);

  const publishedNews = useMemo(() => {
    const map = new Map<string, NewsArticle>();
    news
      .filter((n) => n.status === 'PUBLISHED')
      .sort((a, b) => {
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      })
      .forEach((item, index) => {
        const id = item.id || `news-home-${index}-${item.title || 'post'}`;
        if (!map.has(id)) {
          map.set(id, { ...item, id });
        }
      });
    return Array.from(map.values()).slice(0, 3);
  }, [news]);

  const handleScanWire = async () => {
    try {
      setIsScanning(true);
      await triggerAINewsBotScan({
        focusType: 'Alumni special achievements, prize winnings, research and fellowships',
        forceHotTopic: true,
        count: 2,
      });
    } catch (e) {
      console.warn('Wire scan info:', e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* ========================================================= */}
      {/* HERO SECTION WITH LIVE GRAPH & DIRECT SEARCH */}
      {/* ========================================================= */}
      <div className="gridbg border-b border-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Heading, Omnisearch & Quick Navigation */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-4 tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Alumni Intelligence Graph</span>
                <span aria-hidden="true">·</span>
                <span>178 Institutions</span>
                <span aria-hidden="true">·</span>
                <span>32 Verified Batches</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-[-.04em] leading-[1.08] navy max-w-2xl">
                Explore where university graduates{' '}
                <span className="text-blue-600">go.</span>
              </h1>

              <p className="mt-4 sm:mt-5 text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl">
                Discover verified alumni cohorts, career pathways, global diaspora, and research outcomes.
                Navigate by university, academic department, graduating batch, or company destination.
              </p>

              {/* Omnisearch Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="mt-6 sm:mt-8 bg-white border border-slate-200/90 shadow-xl shadow-slate-900/5 rounded-2xl p-2 sm:p-2.5 flex items-center max-w-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition"
              >
                <Search className="w-5 h-5 text-slate-400 ml-2.5 shrink-0" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 outline-none text-sm text-slate-900 bg-transparent px-3 placeholder-slate-400"
                  placeholder="Search universities, departments, alumni, companies, batches..."
                />
                <button
                  type="submit"
                  className="bg-navy hover:bg-slate-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  Search
                </button>
              </form>

              {/* Interactive Quick-Jump Suggestions */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Popular:</span>
                <button
                  onClick={() =>
                    onNavigate('departmentProfile', {
                      dept: 'Computer Science and Engineering',
                      uni: 'University of Dhaka',
                    })
                  }
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  Dhaka University CSE
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => handleQuickSearch('Google')}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  Google
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => handleQuickSearch('Software Engineer')}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  Software Engineers
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => handleQuickSearch('Germany')}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  Alumni in Germany
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => handleQuickSearch('PhD')}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  PhD Scholars
                </button>
              </div>

              {/* Account Opening & Sign In Gateway */}
              <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Join the Official University Network</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {!currentUser 
                      ? 'Open your verified student or alumni account, or sign in to synchronize your profile.'
                      : `Welcome back, ${userProfile?.name || 'Member'}! Your campus credentials are active.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {!currentUser ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigate('account', { mode: 'wizard' })}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Open Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('account', { mode: 'login' })}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Log In
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('account', { tab: 'dossier' })}
                      className="bg-navy hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>View Profile & Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Global Intelligence Graph */}
            <div className="lg:col-span-5">
              <GlobalGraph />
            </div>
          </div>

          {/* High-Impact Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mt-10 pt-8 border-t border-slate-200/80">
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Institutions</span>
              <b className="text-xl sm:text-2xl navy mt-1 block">178</b>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Public, Private, Int'l</span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Disciplines</span>
              <b className="text-xl sm:text-2xl navy mt-1 block">48+</b>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Curriculum Taxonomies</span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tracked Batches</span>
              <b className="text-xl sm:text-2xl text-blue-600 mt-1 block">{batches.length || 32}+</b>
              <span className="text-[11px] text-slate-500 mt-0.5 block">1994 Founding → 2029</span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Global Reach</span>
              <b className="text-xl sm:text-2xl navy mt-1 block">25+</b>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Destination Countries</span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 md:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Verified Placements</span>
              <b className="text-xl sm:text-2xl text-emerald-600 mt-1 block">91%</b>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Tech, Research & Public</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DISCOVERY PATHWAYS: CHOOSE HOW YOU WANT TO EXPLORE — PREMIUM */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden">
        {/* Full-bleed gradient background panel */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Section Header */}
          <div className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-[0.18em] bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-full mb-4 shadow-sm">
                <Compass className="w-3.5 h-3.5" />
                <span>Exploration Framework</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black navy tracking-[-0.03em] leading-tight">
                Choose How You Want{' '}
                <span className="relative inline-block">
                  to Explore
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                </span>
              </h2>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                Four precision entry points to research institutional rankings, academic disciplines, verified cohorts, or individual career journeys.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Data · Updated Now
              </span>
            </div>
          </div>

          {/* Premium Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">

            {/* Card 1: Universities */}
            <div
              onClick={() => onNavigate('universities')}
              className="explore-premium-card group relative bg-white border border-slate-200/80 rounded-2xl p-6 cursor-pointer overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1.5 hover:border-blue-300/80 transition-all duration-300"
            >
              {/* Hover shimmer top line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              {/* Step badge */}
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[11px] font-black text-blue-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200">
                01
              </div>

              <div>
                {/* Icon orb */}
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 opacity-60">
                  Directory
                </div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  Universities
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Browse 178 institutions with official insignia, verified campus profiles, and faculty offerings.
                </p>

                {/* Stat pill */}
                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  178 Institutions
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700">Explore campuses</span>
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Card 2: Departments */}
            <div
              onClick={() => onNavigate('department')}
              className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 cursor-pointer overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1.5 hover:border-emerald-300/80 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[11px] font-black text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-200">
                02
              </div>

              <div>
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <BookOpen className="w-6 h-6 text-white" />
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 opacity-60">
                  Academic
                </div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                  Departments
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Explore 48 disciplines from Computer Science to Economics, seeing which universities offer them.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  48 Disciplines
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700">View all disciplines</span>
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Card 3: Alumni */}
            <div
              onClick={() => onNavigate('alumni')}
              className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 cursor-pointer overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-indigo-900/10 hover:-translate-y-1.5 hover:border-indigo-300/80 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-[11px] font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200">
                03
              </div>

              <div>
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 opacity-60">
                  Roster
                </div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                  Alumni Network
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Filter alumni by company, job role, destination country, graduation year, and degree qualification.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Verified Profiles
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700">Search alumni roster</span>
                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Card 4: AI Intelligence & News */}
            <div
              onClick={() => onNavigate('news')}
              className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 cursor-pointer overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-1.5 hover:border-purple-300/80 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[11px] font-black text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all duration-200">
                04
              </div>

              <div>
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                  <Bot className="w-6 h-6 text-white" />
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 opacity-60">
                  AI Wire
                </div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-purple-600 transition-colors leading-snug">
                  Intelligence & News
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Live web-scanned alumni achievements, research paper breakthroughs, fellowship awards, and honors.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  24h Live Bot Active
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 group-hover:text-purple-700">Read live achievements</span>
                <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-600 transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Card 5: Analytics & Insights */}
            <div
              onClick={() => onNavigate('analytics')}
              className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 cursor-pointer overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1.5 hover:border-blue-400/80 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[11px] font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200">
                05
              </div>

              <div>
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)' }}
                >
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 opacity-60">
                  Analytics
                </div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  Career Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Interactive charts for institutional distribution, graduation batches, and top industry sectors.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Live Charts
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700">Open dashboard</span>
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom trust strip */}
          <div className="mt-10 pt-8 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              UGC Verified Data
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              178 Institutions Indexed
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Real-time Alumni Profiles
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              AI-Powered News Wire
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FEATURED DEPARTMENT SHOWCASE: DU CSE 1994 - 2029 */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="hero-navy-card p-6 sm:p-10 relative overflow-hidden">
          {/* Subtle background graphic */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <GraduationCap className="w-96 h-96 text-white" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-blue-300 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Featured Department Intelligence Spotlight</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                ✓ 32 Cohorts Verified
              </span>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Department of Computer Science & Engineering
                </h2>
                <p className="text-blue-200 text-sm sm:text-base mt-1 font-medium">
                  University of Dhaka · Established 1992 · First Graduating Cohort 1994
                </p>

                <p className="text-slate-300 text-xs sm:text-sm mt-3.5 leading-relaxed max-w-2xl">
                  {DU_CSE_ANALYTICS.denominatorExplanation ||
                    'Comprehensive source-backed career records tracing 32 graduating cohorts from founding pioneer classes to modern software architects, university professors, Google/Meta engineers, and doctoral researchers.'}
                </p>

                {/* Spotlight metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                  <div>
                    <span className="text-[11px] text-blue-200 block">Researched Cohorts</span>
                    <b className="text-xl text-white font-bold block mt-0.5">32 Batches</b>
                    <span className="text-[10px] text-slate-400">1994 — 2029</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-200 block">Verified Alumni</span>
                    <b className="text-xl text-white font-bold block mt-0.5">75 Profiles</b>
                    <span className="text-[10px] text-slate-400">Source-backed</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-200 block">Employment Placements</span>
                    <b className="text-xl text-emerald-300 font-bold block mt-0.5">91%</b>
                    <span className="text-[10px] text-slate-400">Tech & Academia</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-200 block">Global Presence</span>
                    <b className="text-xl text-white font-bold block mt-0.5">18 Countries</b>
                    <span className="text-[10px] text-slate-400">USA, Germany, UK...</span>
                  </div>
                </div>

                {/* Quick Cohort Jump Buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-blue-200 font-semibold mr-1">Quick Cohorts:</span>
                  {[
                    { label: 'Batch #0 (1994 Founding)', year: '1994', num: 0 },
                    { label: 'Batch #1 (1999)', year: '1999', num: 1 },
                    { label: 'Batch #10 (2008)', year: '2008', num: 10 },
                    { label: 'Batch #23 (2021)', year: '2021', num: 23 },
                    { label: 'Batch #25 (2023)', year: '2023', num: 25 },
                  ].map((b) => (
                    <button
                      key={b.year}
                      onClick={() =>
                        onNavigate('departmentBatch', {
                          dept: 'Computer Science and Engineering',
                          uni: 'University of Dhaka',
                          batch: b.year,
                          batchNumber: String(b.num),
                        })
                      }
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/20 transition cursor-pointer font-medium"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Call-To-Action Box */}
              <div className="lg:col-span-4 flex flex-col gap-3">
                <button
                  onClick={() =>
                    onNavigate('departmentProfile', {
                      dept: 'Computer Science and Engineering',
                      uni: 'University of Dhaka',
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore DU CSE Profile & Charts</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    onNavigate('departmentBatch', {
                      dept: 'Computer Science and Engineering',
                      uni: 'University of Dhaka',
                      batch: '2023',
                      batchNumber: '25',
                    })
                  }
                  className="bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl text-xs transition border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Browse Latest Researched Cohort</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GLOBAL CAREER DESTINATIONS & DIASPORA HUB */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>GLOBAL DIASPORA & EMPLOYMENT HUBS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black navy tracking-tight mt-1">
                Where Do Graduates Build Their Careers?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Click any company or international destination to discover alumni working there.
              </p>
            </div>

            {/* Segmented Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
              <button
                onClick={() => setDiasporaTab('EMPLOYERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  diasporaTab === 'EMPLOYERS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Top Employers</span>
              </button>
              <button
                onClick={() => setDiasporaTab('COUNTRIES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  diasporaTab === 'COUNTRIES' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Countries</span>
              </button>
            </div>
          </div>

          {/* Interactive Chips Grid */}
          <div className="mt-6">
            {diasporaTab === 'EMPLOYERS' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {topEmployers.map(([company, count]) => (
                  <button
                    key={company}
                    onClick={() => handleQuickSearch(company)}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200/90 rounded-xl text-left transition group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <b className="navy text-xs sm:text-sm group-hover:text-blue-600 transition truncate max-w-[140px]">
                        {company}
                      </b>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">
                      {count} verified alumni
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topCountries.map(([country, count]) => (
                  <button
                    key={country}
                    onClick={() => handleQuickSearch(country)}
                    className="p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200/90 rounded-xl text-left transition group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <b className="navy text-sm group-hover:text-blue-600 transition block">
                        {country}
                      </b>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {count} verified alumni
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* INSTITUTIONAL DIRECTORY & OFFICIAL LOGOS SHOWCASE */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>INSTITUTIONAL DIRECTORY & INSIGNIA</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live Admin Synchronized
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black navy tracking-tight">
              Universities, Official Logos & Academic Departments
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Explore official university emblems, active faculties, verified curriculum offerings, and alumni community outcomes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('universities')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              <span>Explore All {masterUniversities.length} Institutions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('department')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Browse All Departments</span>
            </button>
          </div>
        </div>

        {/* Real-time Search & Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={uniSearch}
                onChange={(e) => setUniSearch(e.target.value)}
                placeholder="Search by university name, short code (DU, BUET), city, or department..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
              {uniSearch && (
                <button
                  onClick={() => setUniSearch('')}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Institution Type Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['All', 'Public', 'Private', 'International'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setUniTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    uniTypeFilter === t
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'All' ? 'All Types' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Discipline / Field Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Discipline:
            </span>
            {DISCIPLINE_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setSelectedDeptGroup(pill.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedDeptGroup === pill.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Universities Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(showAllUnis ? filteredShowcase : filteredShowcase.slice(0, 9)).map((uni) => {
            const deptNamesSet = new Set<string>();
            departments.forEach((d) => {
              if ((d.university || '').toLowerCase().trim() === uni.name.toLowerCase().trim() && d.status !== 'Inactive') {
                deptNamesSet.add(d.name);
              }
            });
            VERIFIED_DEPARTMENT_SEEDS.forEach((s) => {
              if ((s.university || '').toLowerCase().trim() === uni.name.toLowerCase().trim()) {
                deptNamesSet.add(s.name);
              }
            });
            const uniDeptNames = Array.from(deptNamesSet);
            const liveAlumni = alumni.filter(
              (a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && (a.university || '').toLowerCase().trim() === uni.name.toLowerCase().trim()
            ).length;
            const liveStudents = students.filter(
              (s) => (!s.status || s.status.toUpperCase() === 'APPROVED') && (s.university || '').toLowerCase().trim() === uni.name.toLowerCase().trim()
            ).length;

            return (
              <div
                key={uni.id}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header: Logo + Info */}
                  <div className="flex items-start gap-3.5">
                    <UniversityLogo name={uni.name} logoUrl={uni.logoUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {uni.type}
                        </span>
                        {uni.shortName && (
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {uni.shortName}
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => onNavigate('universityDetail', { name: uni.name })}
                        className="font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug mt-1 cursor-pointer truncate"
                        title={uni.name}
                      >
                        {uni.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{uni.location || 'Bangladesh'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Department Badges Preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Departments ({uniDeptNames.length})</span>
                      <button
                        onClick={() => onNavigate('universityDetail', { name: uni.name })}
                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View all
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {uniDeptNames.slice(0, 3).map((deptName) => (
                        <button
                          key={deptName}
                          onClick={() =>
                            onNavigate('departmentProfile', {
                              dept: deptName,
                              uni: uni.name,
                            })
                          }
                          className="text-[11px] font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition truncate max-w-[200px] cursor-pointer"
                          title={deptName}
                        >
                          {deptName}
                        </button>
                      ))}

                      {uniDeptNames.length > 3 && (
                        <button
                          onClick={() => onNavigate('universityDetail', { name: uni.name })}
                          className="text-[11px] font-semibold text-blue-600 bg-blue-50/60 px-2 py-1 rounded-lg hover:underline cursor-pointer"
                        >
                          +{uniDeptNames.length - 3} more
                        </button>
                      )}

                      {uniDeptNames.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">
                          Standard curriculum catalogue active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Metrics & Explore CTA */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Alumni</span>
                      <b className="navy">{liveAlumni || uni.alumniCount || 0}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Students</span>
                      <b className="text-blue-600">{liveStudents || uni.studentCount || 0}</b>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('universityDetail', { name: uni.name })}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    <span>Campus Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if search finds nothing */}
        {filteredShowcase.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">No institutions found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No universities matched your current search "{uniSearch}". Try clearing your filters or search keywords.
            </p>
            <button
              onClick={() => {
                setUniSearch('');
                setUniTypeFilter('All');
                setSelectedDeptGroup('All');
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Show More / Show All Button */}
        {filteredShowcase.length > 9 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowAllUnis((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-6 py-3 rounded-2xl border border-slate-300 shadow-xs transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>
                {showAllUnis
                  ? 'Show Fewer Universities'
                  : `Show All ${filteredShowcase.length} Matching Universities`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* FEATURED VERIFIED ALUMNI SPOTLIGHT */}
      {/* ========================================================= */}
      {featuredAlumniList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>VERIFIED COMMUNITY SPOTLIGHT</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black navy tracking-tight mt-1">
                Meet Verified Alumni
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Explore real profiles of leaders, founders, professors, and researchers across our network.
              </p>
            </div>

            <button
              onClick={() => onNavigate('alumni')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer self-start sm:self-end"
            >
              <span>Explore all verified alumni →</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {featuredAlumniList.map((alumnus) => {
              const initials = alumnus.name
                .split(' ')
                .map((x) => x[0])
                .join('')
                .slice(0, 2);

              return (
                <div
                  key={alumnus.id}
                  onClick={() => onNavigate('alumniProfile', { id: alumnus.id, name: alumnus.name })}
                  className="card p-5 hover:border-blue-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl avatar flex items-center justify-center font-bold text-sm shrink-0 bg-linear-to-br from-blue-700 to-indigo-900 text-white shadow-xs">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <b className="navy text-sm group-hover:text-blue-600 transition truncate block">
                            {alumnus.name}
                          </b>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            ✓ Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold mt-0.5 truncate">
                          {alumnus.jobRole}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          at <span className="navy font-medium">{alumnus.company}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {alumnus.degree ? `${alumnus.degree} · ` : ''}{alumnus.department} ({alumnus.batch || alumnus.graduationYear})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{alumnus.city ? `${alumnus.city}, ` : ''}{alumnus.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                    <span>View journey & credentials</span>
                    <span className="group-hover:translate-x-1 transition">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIVE NEWS & ACHIEVEMENTS WIRE */}
      {/* ========================================================= */}
      <div className="bg-slate-50/70 border-t border-b border-soft py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  LIVE ALUMNI WIRE
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span>24h AI Wire Bot Active</span>
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black navy tracking-tight">
                University & Alumni Achievements
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Verified achievements, prize winnings, research breakthroughs, and institutional announcements.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-end">
              <button
                onClick={handleScanWire}
                disabled={isScanning}
                className="bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-blue-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Trigger instant AI bot web scan for alumni achievements"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-600' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan AI Wire'}</span>
              </button>
              <button
                onClick={() => onNavigate('news')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Browse all news →
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {publishedNews.map((article, idx) => {
              const articleKey = article.id || `home-news-item-${idx}-${article.title || 'post'}`;
              const daysLeft = article.expiresAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(article.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  )
                : null;

              return (
                <div
                  key={articleKey}
                  onClick={() => onNavigate('newsDetail', { id: article.id })}
                  className={`card overflow-hidden hover:-translate-y-1 transition cursor-pointer flex flex-col ${
                    article.isHotTopic ? 'border-rose-300 ring-2 ring-rose-200/60' : ''
                  }`}
                >
                  {article.imageUrl && (
                    <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition duration-300 hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-blue-700 shadow-sm">
                          {article.category}
                        </span>
                        {article.isHotTopic && (
                          <span className="bg-rose-600 text-white px-2.5 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1 shadow-sm animate-pulse">
                            <Flame className="w-3 h-3 text-amber-300" />
                            HOT TOPIC
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {article.alumniPrizeName && (
                        <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Award className="w-3 h-3 text-amber-600" />
                          <span className="truncate max-w-[220px]">{article.alumniPrizeName}</span>
                        </div>
                      )}

                      <h3 className="font-bold text-base text-slate-900 line-clamp-2 leading-snug hover:text-blue-600 transition">
                        {article.title}
                      </h3>

                      {article.hotTopicReason && (
                        <p className="text-[11px] text-rose-700 font-bold mt-1.5">
                          🔥 {article.hotTopicReason}
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {article.summary || article.content.slice(0, 120) + '...'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-3">
                        {article.university && <span>{article.university}</span>}
                        {article.university && article.department && <span aria-hidden="true">·</span>}
                        {article.department && <span className="text-purple-700 font-medium">{article.department}</span>}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-soft flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {article.isPermanent ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            Permanent
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                      <span className="text-blue-600 font-semibold">Read article →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
