import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { GlobalGraph } from '../components/GlobalGraph';
import { universityInitials } from '../data/initialData';

interface HomeViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSearch: (query: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onSearch }) => {
  const { universities, news } = useData();
  const [searchInput, setSearchInput] = useState('');

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

  // Top showcase universities across Bangladesh
  const showcaseList = [
    {
      name: 'University of Dhaka',
      abbr: 'DU',
      alumni: '8,920',
      employment: '87%',
      bg: 'bg-emerald-50 text-emerald-700',
    },
    {
      name: 'Bangladesh University of Engineering & Technology',
      abbr: 'BUET',
      alumni: '6,240',
      employment: '91%',
      bg: 'bg-blue-50 text-blue-700',
    },
    {
      name: 'North South University',
      abbr: 'NSU',
      alumni: '5,800',
      employment: '86%',
      bg: 'bg-purple-50 text-purple-700',
    },
    {
      name: 'Jahangirnagar University',
      abbr: 'JU',
      alumni: '5,110',
      employment: '83%',
      bg: 'bg-indigo-50 text-indigo-700',
    },
  ];

  const publishedNews = news.filter((n) => n.status === 'PUBLISHED').slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <div className="gridbg border-b border-soft">
        <div className="max-w-7xl mx-auto px-5 pt-14 pb-20 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 pill mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Building the world's university career graph
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-.045em] leading-[1.05] navy max-w-3xl">
              Explore where university graduates{' '}
              <span className="text-blue-600">go.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-8 text-slate-500 max-w-2xl">
              Discover alumni, career paths, employment outcomes, achievements and global university
              networks — all in one structured platform powered by real-time intelligence.
            </p>

            {/* Omnisearch Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 bg-white border border-soft shadow-xl shadow-slate-900/5 rounded-2xl p-2 flex items-center max-w-2xl"
            >
              <span className="px-3 text-slate-400 text-lg">⌕</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 outline-none text-sm text-slate-900 bg-transparent pr-2"
                placeholder="Search universities, departments, alumni, companies, batches..."
              />
              <button
                type="submit"
                className="bg-navy text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition"
              >
                Search
              </button>
            </form>

            {/* Quick search links */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Try</span>
              <button
                onClick={() => handleQuickSearch('Computer Science alumni')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Computer Science alumni
              </button>
              <span>·</span>
              <button
                onClick={() => handleQuickSearch('Alumni in Germany')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Alumni in Germany
              </button>
              <span>·</span>
              <button
                onClick={() => handleQuickSearch('Software Engineers')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Software Engineers
              </button>
            </div>
          </div>

          {/* Network Graph */}
          <div className="relative">
            <GlobalGraph />
          </div>
        </div>
      </div>

      {/* Showcase Universities Section */}
      <div className="max-w-7xl mx-auto px-5 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Explore</div>
            <h2 className="text-3xl font-black navy mt-2">Universities on the network</h2>
          </div>
          <button
            onClick={() => onNavigate('universities')}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            View all 178 institutions →
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {showcaseList.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate('universityDetail', { name: item.name })}
              className="card p-5 text-left hover:-translate-y-1 transition group flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center font-black mb-5`}
                >
                  {item.abbr}
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Dhaka, Bangladesh</p>
              </div>
              <div>
                <div className="line my-4"></div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Alumni</span>
                  <b className="navy">{item.alumni}</b>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-400">Employment</span>
                  <b className="text-emerald-600">{item.employment}</b>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Live News Highlights Section */}
      <div className="bg-slate-50/60 border-t border-b border-soft py-16">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                LIVE UPDATES
              </div>
              <h2 className="text-3xl font-black navy mt-2">University & Alumni News</h2>
              <p className="text-sm text-slate-500 mt-1">
                Verified achievements, research milestones, and institutional announcements.
              </p>
            </div>
            <button
              onClick={() => onNavigate('news')}
              className="text-sm font-bold text-blue-600 hover:underline self-start md:self-end"
            >
              Browse all news →
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {publishedNews.map((article) => (
              <div
                key={article.id}
                onClick={() => onNavigate('newsDetail', { id: article.id })}
                className="card overflow-hidden hover:-translate-y-1 transition cursor-pointer flex flex-col"
              >
                {article.imageUrl && (
                  <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover transition duration-300 hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-blue-700 shadow-sm">
                      {article.category}
                    </span>
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {article.summary || article.content.slice(0, 120) + '...'}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-soft flex items-center justify-between text-xs text-slate-400">
                    <span>{article.authorName}</span>
                    <span className="text-blue-600 font-semibold">Read article →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
