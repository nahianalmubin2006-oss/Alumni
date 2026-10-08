import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { GlobalGraph } from '../components/GlobalGraph';
import { universityInitials } from '../data/initialData';
import { Flame, Award, Bot, Clock, Shield, RefreshCw } from 'lucide-react';
import { NewsArticle } from '../types';

interface HomeViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSearch: (query: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onSearch }) => {
  const { universities, alumni, news, botStatus, triggerAINewsBotScan } = useData();
  const [searchInput, setSearchInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);

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

  // Showcase universities are sourced from the live Firestore-backed directory.
  const showcaseNames = [
    { name: 'University of Dhaka', abbr: 'DU', bg: 'bg-emerald-50 text-emerald-700', logo: '/du-logo.png' },
    { name: 'Bangladesh University of Engineering & Technology', abbr: 'BUET', bg: 'bg-blue-50 text-blue-700' },
    { name: 'North South University', abbr: 'NSU', bg: 'bg-purple-50 text-purple-700' },
    { name: 'Jahangirnagar University', abbr: 'JU', bg: 'bg-indigo-50 text-indigo-700' },
  ];
  const showcaseList = showcaseNames.map((item) => {
    const live = universities.find((u) => u.name.toLowerCase() === item.name.toLowerCase());
    const liveAlumni = alumni.filter((a) => a.status === 'APPROVED' && a.university.toLowerCase() === item.name.toLowerCase()).length;
    return { ...item, alumni: String(liveAlumni), employment: live?.employmentRate ? `${live.employmentRate}%` : '—' };
  });

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
    return Array.from(map.values()).slice(0, 6);
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
    <div>
      {/* Hero Section */}
      <div className="gridbg border-b border-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 pt-8 sm:pt-14 pb-12 sm:pb-20 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 pill mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Building the world's university career graph
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-[-.045em] leading-[1.05] navy max-w-3xl">
              Explore where university graduates{' '}
              <span className="text-blue-600">go.</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-7 sm:leading-8 text-slate-500 max-w-2xl">
              Discover alumni, career paths, employment outcomes, achievements and global university
              networks — all in one structured platform powered by real-time intelligence.
            </p>

            {/* Omnisearch Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 sm:mt-8 bg-white border border-soft shadow-xl shadow-slate-900/5 rounded-2xl p-2 flex items-center max-w-2xl"
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
                className="bg-navy text-white px-4 sm:px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-5 py-10 sm:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Explore</div>
            <h2 className="text-2xl sm:text-3xl font-black navy mt-2">Universities on the network</h2>
          </div>
          <button
            onClick={() => onNavigate('universities')}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            View all 178 institutions →
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {showcaseList.map((item) => (
            <button
              key={item.name}
              onClick={() => onNavigate('universityDetail', { name: item.name })}
              className="card p-5 text-left hover:-translate-y-1 transition group flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center font-black mb-5 overflow-hidden p-1 border border-slate-200/50`}
                >
                  {item.logo ? (
                    <img src={item.logo} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    item.abbr
                  )}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  LIVE UPDATES
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span>24h AI Wire Bot Active</span>
                </span>
              </div>
              <h2 className="text-3xl font-black navy">University & Alumni News</h2>
              <p className="text-sm text-slate-500 mt-1">
                Verified achievements, prize winnings, research breakthroughs, and institutional announcements.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-end">
              <button
                onClick={handleScanWire}
                disabled={isScanning}
                className="bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs px-3 py-2 rounded-xl border border-blue-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Trigger instant AI bot web scan for alumni achievements"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-600' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan AI Wire'}</span>
              </button>
              <button
                onClick={() => onNavigate('news')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
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

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {article.university && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {article.university}
                          </span>
                        )}
                        {article.department && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {article.department}
                          </span>
                        )}
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
