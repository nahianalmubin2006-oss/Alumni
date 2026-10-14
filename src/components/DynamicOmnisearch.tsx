import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  Globe,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { RAW_DEPARTMENT_CATALOG, ALL_DIRECTORY_UNIVERSITIES } from '../data/initialData';

interface DynamicOmnisearchProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSearch: (query: string) => void;
  onSelectAlumnusPreview?: (alumnusId: string) => void;
  placeholder?: string;
  className?: string;
}

export const DynamicOmnisearch: React.FC<DynamicOmnisearchProps> = ({
  onNavigate,
  onSearch,
  onSelectAlumnusPreview,
  placeholder = 'Search universities, departments, alumni, companies, batches...',
  className = '',
}) => {
  const { alumni, universities } = useData();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute multi-category matches
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    // 1. Universities
    const matchedUnis = ALL_DIRECTORY_UNIVERSITIES.filter((u) => {
      const name = u.name.toLowerCase();
      const code = u.name.split(' ').map((w) => w[0]).join('').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 3);

    // 2. Alumni
    const matchedAlumni = alumni
      .filter((a) => {
        if (a.publicDirectoryVisible === false) return false;
        const hay = [a.name, a.company, a.jobRole, a.department, a.graduationYear, a.batch]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 4);

    // 3. Academic Departments
    const matchedDepts = RAW_DEPARTMENT_CATALOG.filter((d) => {
      const name = d.name.toLowerCase();
      const aliasMatch = d.aliases.some((al) => al.toLowerCase().includes(q));
      return name.includes(q) || aliasMatch;
    }).slice(0, 3);

    // 4. Companies & Chapters
    const companySet = new Map<string, number>();
    alumni.forEach((a) => {
      if (a.company && a.company.toLowerCase().includes(q)) {
        companySet.set(a.company, (companySet.get(a.company) || 0) + 1);
      }
    });
    const matchedCompanies = Array.from(companySet.entries()).slice(0, 2);

    const hasResults =
      matchedUnis.length > 0 ||
      matchedAlumni.length > 0 ||
      matchedDepts.length > 0 ||
      matchedCompanies.length > 0;

    return {
      hasResults,
      universities: matchedUnis,
      alumni: matchedAlumni,
      departments: matchedDepts,
      companies: matchedCompanies,
    };
  }, [query, alumni]);

  // Flatten suggestions for keyboard navigation
  const flatItems = useMemo(() => {
    if (!suggestions || !suggestions.hasResults) return [];
    const items: Array<{
      type: 'uni' | 'alumnus' | 'dept' | 'company';
      id: string;
      action: () => void;
    }> = [];

    suggestions.universities.forEach((u) => {
      items.push({
        type: 'uni',
        id: `u-${u.name}`,
        action: () => {
          setIsOpen(false);
          onNavigate('universityDetail', { name: u.name });
        },
      });
    });

    suggestions.alumni.forEach((a) => {
      items.push({
        type: 'alumnus',
        id: `a-${a.id}`,
        action: () => {
          setIsOpen(false);
          if (onSelectAlumnusPreview) {
            onSelectAlumnusPreview(a.id);
          } else {
            onNavigate('alumniProfile', { id: a.id, name: a.name });
          }
        },
      });
    });

    suggestions.departments.forEach((d) => {
      items.push({
        type: 'dept',
        id: `d-${d.name}`,
        action: () => {
          setIsOpen(false);
          onNavigate('departmentUniversities', { dept: d.name, group: d.group });
        },
      });
    });

    suggestions.companies.forEach(([comp]) => {
      items.push({
        type: 'company',
        id: `c-${comp}`,
        action: () => {
          setIsOpen(false);
          onSearch(comp);
        },
      });
    });

    return items;
  }, [suggestions, onNavigate, onSearch, onSelectAlumnusPreview]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) {
          setIsOpen(false);
          onSearch(query.trim());
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        flatItems[activeIndex].action();
      } else if (query.trim()) {
        setIsOpen(false);
        onSearch(query.trim());
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      onSearch(query.trim());
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 rounded-2xl p-2 sm:p-2.5 flex items-center focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition relative z-20"
      >
        <Search className="w-5 h-5 text-slate-400 ml-2.5 shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-sm text-slate-900 dark:text-white bg-transparent px-3 placeholder-slate-400"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen && Boolean(suggestions?.hasResults)}
          aria-autocomplete="list"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveIndex(-1);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2 cursor-pointer"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className="bg-navy hover:bg-slate-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          Search
        </button>
      </form>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions && suggestions.hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-98 duration-100">
          {/* Universities Category */}
          {suggestions.universities.length > 0 && (
            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1.5">
                <Building2 className="w-3 h-3 text-blue-500" />
                <span>Institutions ({suggestions.universities.length})</span>
              </span>
              <div className="space-y-1">
                {suggestions.universities.map((uni) => (
                  <div
                    key={uni.name}
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('universityDetail', { name: uni.name });
                    }}
                    className="p-2 rounded-xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {uni.name[0]}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 block truncate">
                          {uni.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{uni.type} University</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumni Category */}
          {suggestions.alumni.length > 0 && (
            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1.5">
                <Users className="w-3 h-3 text-indigo-500" />
                <span>Verified Alumni ({suggestions.alumni.length})</span>
              </span>
              <div className="space-y-1">
                {suggestions.alumni.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setIsOpen(false);
                      if (onSelectAlumnusPreview) {
                        onSelectAlumnusPreview(a.id);
                      } else {
                        onNavigate('alumniProfile', { id: a.id, name: a.name });
                      }
                    }}
                    className="p-2 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {a.name[0]}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 truncate">
                            {a.name}
                          </span>
                          {a.isVerified && (
                            <span className="text-[9px] font-bold text-emerald-600 shrink-0">✓</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {a.jobRole || 'Graduate'} {a.company ? `· ${a.company}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline shrink-0">
                      View →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Departments Category */}
          {suggestions.departments.length > 0 && (
            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1.5">
                <GraduationCap className="w-3 h-3 text-emerald-500" />
                <span>Disciplines & Faculties ({suggestions.departments.length})</span>
              </span>
              <div className="space-y-1">
                {suggestions.departments.map((d) => (
                  <div
                    key={d.name}
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('departmentUniversities', { dept: d.name, group: d.group });
                    }}
                    className="p-2 rounded-xl hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 block truncate">
                        {d.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{d.group} Discipline</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Companies Category */}
          {suggestions.companies.length > 0 && (
            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3 h-3 text-amber-500" />
                <span>Career Destinations</span>
              </span>
              <div className="space-y-1">
                {suggestions.companies.map(([company, count]) => (
                  <div
                    key={company}
                    onClick={() => {
                      setIsOpen(false);
                      onSearch(company);
                    }}
                    className="p-2 rounded-xl hover:bg-amber-50/70 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 truncate">
                      {company}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {count} alumni
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Search Action Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Press <b>Enter</b> to run full query &ldquo;{query}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSearch(query);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              See all results →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
