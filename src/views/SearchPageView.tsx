import React, { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG, universityInitials } from '../data/initialData';

interface SearchPageViewProps {
  initialQuery?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const SearchPageView: React.FC<SearchPageViewProps> = ({
  initialQuery = '',
  onNavigate,
  onBack,
}) => {
  const { universities, alumni, students, news } = useData();

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<'all' | 'universities' | 'departments' | 'alumni' | 'news'>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        matchedUnis: [],
        matchedDepts: [],
        matchedAlumni: [],
        matchedNews: [],
        total: 0,
      };
    }

    // 1. Universities (from live state with baseline directory fallback)
    const uniSource = universities && universities.length > 0 ? universities : ALL_DIRECTORY_UNIVERSITIES;
    const matchedUnis = uniSource.filter((u) =>
      (u.name || '').toLowerCase().includes(q)
    ).slice(0, 12);

    // 2. Departments
    const matchedDepts = RAW_DEPARTMENT_CATALOG.filter((d) =>
      [d.name, d.group, ...(d.aliases || [])].join(' ').toLowerCase().includes(q)
    ).slice(0, 12);

    // 3. Alumni and Students / Companies / Countries / Batches
    const matchedAlumni = alumni.filter((a) => {
      const hay = [
        a.name || '',
        a.university || '',
        a.department || '',
        a.company || '',
        a.country || '',
        a.city || '',
        a.jobRole || '',
        a.batch || '',
        a.graduationYear || '',
        a.studentId || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).slice(0, 16);

    // Also include matched enrolled students if not already in list
    if (students && students.length > 0) {
      const matchedStudents = students.filter((s) => {
        const hay = [
          s.name || '',
          s.university || '',
          s.department || '',
          s.studentId || '',
          s.studentYear || '',
          s.expectedGraduation || '',
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
      matchedStudents.forEach((st) => {
        if (!matchedAlumni.some((a) => a.id === st.id || a.userId === st.userId)) {
          matchedAlumni.push({
            id: st.id,
            userId: st.userId,
            name: st.name,
            email: st.email,
            university: st.university,
            department: st.department,
            batch: st.expectedGraduation || 'Student',
            studentId: st.studentId,
            bio: st.bio,
            photoUrl: st.photoUrl,
            status: 'APPROVED',
            isVerified: false,
            createdAt: st.createdAt,
            updatedAt: st.updatedAt,
          } as any);
        }
      });
    }

    // 4. News
    const matchedNews = news.filter((n) => {
      const hay = [n.title, n.summary, n.content, n.category, n.university, n.department]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).slice(0, 10);

    const total =
      matchedUnis.length +
      matchedDepts.length +
      matchedAlumni.length +
      matchedNews.length;

    return {
      matchedUnis,
      matchedDepts,
      matchedAlumni,
      matchedNews,
      total,
    };
  }, [query, universities, alumni, students, news]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3 mb-6">
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
        Omni-Search Engine
      </div>
      <h1 className="text-3xl sm:text-4xl font-black navy mt-2">Search AlumniSphere</h1>
      <p className="text-slate-500 mt-2 text-sm">
        Discover universities, academic departments, student cohorts, verified alumni, companies,
        countries, and live news.
      </p>

      {/* Search Input Bar */}
      <div className="mt-6 card p-2.5 flex items-center shadow-lg border-soft">
        <span className="px-3 text-slate-400 text-lg">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 outline-none text-base bg-transparent text-slate-900"
          placeholder="Try “Computer Science alumni”, “Germany”, “BUET”, “Software Engineer”..."
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-3 font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mt-6 overflow-x-auto pb-2 border-b border-soft">
        <button
          onClick={() => setActiveCategory('all')}
          className={`pill cursor-pointer transition ${
            activeCategory === 'all' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          All Results ({results.total})
        </button>
        <button
          onClick={() => setActiveCategory('universities')}
          className={`pill cursor-pointer transition ${
            activeCategory === 'universities' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Universities ({results.matchedUnis.length})
        </button>
        <button
          onClick={() => setActiveCategory('departments')}
          className={`pill cursor-pointer transition ${
            activeCategory === 'departments' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Departments ({results.matchedDepts.length})
        </button>
        <button
          onClick={() => setActiveCategory('alumni')}
          className={`pill cursor-pointer transition ${
            activeCategory === 'alumni' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Alumni & Careers ({results.matchedAlumni.length})
        </button>
        <button
          onClick={() => setActiveCategory('news')}
          className={`pill cursor-pointer transition ${
            activeCategory === 'news' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          News Stories ({results.matchedNews.length})
        </button>
      </div>

      {/* Results Section */}
      <div className="mt-8 space-y-8">
        {/* Universities */}
        {(activeCategory === 'all' || activeCategory === 'universities') &&
          results.matchedUnis.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black navy text-base">Universities</h3>
                <span className="text-xs text-slate-400">{results.matchedUnis.length} matches</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.matchedUnis.map((u) => (
                  <button
                    key={u.name}
                    onClick={() => onNavigate('universityDetail', { name: u.name })}
                    className="card p-4 text-left hover:border-blue-300 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs navy">
                        {universityInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <b className="navy text-xs block truncate group-hover:text-blue-600 transition">
                          {u.name}
                        </b>
                        <span className="text-[11px] text-slate-400">{u.type} · Bangladesh</span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-bold group-hover:translate-x-1 transition text-sm">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Departments */}
        {(activeCategory === 'all' || activeCategory === 'departments') &&
          results.matchedDepts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black navy text-base">Academic Departments</h3>
                <span className="text-xs text-slate-400">{results.matchedDepts.length} matches</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.matchedDepts.map((d) => (
                  <button
                    key={d.name}
                    onClick={() =>
                      onNavigate('departmentUniversities', {
                        dept: d.name,
                        group: d.group,
                      })
                    }
                    className="card p-4 text-left hover:border-blue-300 transition flex items-center justify-between group"
                  >
                    <div>
                      <b className="navy text-xs block group-hover:text-blue-600 transition">
                        {d.name}
                      </b>
                      <span className="text-[11px] text-slate-400">{d.group} Discipline</span>
                    </div>
                    <span className="text-blue-600 font-bold group-hover:translate-x-1 transition text-sm">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Alumni */}
        {(activeCategory === 'all' || activeCategory === 'alumni') &&
          results.matchedAlumni.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black navy text-base">Alumni & Graduates</h3>
                <span className="text-xs text-slate-400">{results.matchedAlumni.length} matches</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.matchedAlumni.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onNavigate('alumniProfile', { id: a.id, name: a.name })}
                    className="card p-4 text-left hover:border-blue-300 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full avatar flex items-center justify-center font-bold text-xs">
                        {a.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <b className="navy text-xs block group-hover:text-blue-600 transition">
                          {a.name}
                        </b>
                        <p className="text-[11px] text-slate-500 truncate">{a.jobRole} · {a.company}</p>
                        <p className="text-[10px] text-slate-400 truncate">{a.country} · {a.university}</p>
                      </div>
                    </div>
                    {a.isVerified && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
                        ✓ Verified
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* News */}
        {(activeCategory === 'all' || activeCategory === 'news') &&
          results.matchedNews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black navy text-base">News Stories & Announcements</h3>
                <span className="text-xs text-slate-400">{results.matchedNews.length} matches</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {results.matchedNews.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onNavigate('newsDetail', { id: n.id })}
                    className="card p-4 text-left hover:border-blue-300 transition block group"
                  >
                    <span className="pill text-[10px] text-blue-600 mb-1">{n.category}</span>
                    <b className="navy text-xs block group-hover:text-blue-600 transition mt-1">
                      {n.title}
                    </b>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{n.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

        {results.total === 0 && query && (
          <div className="card p-12 text-center text-slate-400">
            <p className="font-semibold text-base">No results found for “{query}”</p>
            <p className="text-xs mt-1">
              Try searching by university acronyms (e.g. DU, BUET, NSU, JU), department names, countries, or
              companies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
