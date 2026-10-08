import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NewsCategory, NewsArticle, Role } from '../types';
import { RAW_DEPARTMENT_CATALOG } from '../data/initialData';
import {
  Bot,
  Flame,
  Award,
  Shield,
  Clock,
  ExternalLink,
  Pin,
  Trash2,
  RefreshCw,
  Sparkles,
  Search,
  Plus,
  Building,
  GraduationCap,
  Newspaper,
  CheckCircle2,
  X,
} from 'lucide-react';

interface LiveNewsViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const CATEGORIES: NewsCategory[] = [
  'Alumni special achievements',
  'Alumni achievements',
  'University announcements',
  'Department announcements',
  'Research',
  'Scholarships',
  'Jobs',
  'Events',
  'General education news',
];

export const LiveNewsView: React.FC<LiveNewsViewProps> = ({ onNavigate }) => {
  const {
    news,
    createNewsArticle,
    makeNewsPermanent,
    removeNewsPermanent,
    deleteNewsArticle,
    triggerAINewsBotScan,
    trigger24HourRotationCycle,
    canUserManageArticle,
    cleanupExpiredNews,
    botStatus,
    universities,
    departments,
  } = useData();

  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedRetention, setSelectedRetention] = useState<'All' | 'PERMANENT' | 'EXPIRING'>('All');
  const [search, setSearch] = useState('');

  // AI Bot interaction states
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [botFeedback, setBotFeedback] = useState<string | null>(null);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<NewsCategory>('Alumni special achievements');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newUniversity, setNewUniversity] = useState(userProfile?.university || '');
  const [newDepartment, setNewDepartment] = useState(userProfile?.department || '');
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newIsHot, setNewIsHot] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Delete modal
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Admin news controls belong strictly in the Admin Dashboard
  const canMakePermanent = false;

  // Calculate 24-hour cycle time remaining
  const [timeRemaining24h, setTimeRemaining24h] = useState({ hours: 23, minutes: 59 });

  useEffect(() => {
    const updateCountdown = () => {
      const nextTime = new Date(botStatus?.nextRotationAt || Date.now() + 24 * 3600 * 1000).getTime();
      const diff = Math.max(0, nextTime - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining24h({ hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [botStatus?.nextRotationAt]);

  // List of all universities & departments for selectors
  const universityList = useMemo(() => {
    const list = universities.map((u) => u.name);
    return Array.from(new Set(list));
  }, [universities]);

  const departmentList = useMemo(() => {
    const fromDb = departments.map((d) => d.name);
    const catalog = RAW_DEPARTMENT_CATALOG.map((d) => d.name);
    return Array.from(new Set([...fromDb, ...catalog]));
  }, [departments]);

  // Filter published news
  const publishedList = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED')
      .filter((n) => {
        // Category filter
        if (selectedCategory === 'HOT_TOPICS') return n.isHotTopic;
        if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;

        // University filter
        if (
          selectedUniversity !== 'All' &&
          n.university?.toLowerCase() !== selectedUniversity.toLowerCase()
        ) {
          return false;
        }

        // Department filter
        if (
          selectedDepartment !== 'All' &&
          n.department?.toLowerCase() !== selectedDepartment.toLowerCase()
        ) {
          return false;
        }

        // Retention filter
        if (selectedRetention === 'PERMANENT' && !n.isPermanent) return false;
        if (selectedRetention === 'EXPIRING' && n.isPermanent) return false;

        // Search text
        if (search.trim()) {
          const hay = [
            n.title,
            n.summary,
            n.content,
            n.category,
            n.university,
            n.department,
            n.alumniPrizeName,
            n.authorName,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(search.trim().toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Hot topics float to top, followed by most recent
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      });
  }, [
    news,
    selectedCategory,
    selectedUniversity,
    selectedDepartment,
    selectedRetention,
    search,
  ]);

  // Dedicated breaking hot topics list
  const hotTopicsList = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED' && n.isHotTopic)
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
      );
  }, [news]);

  // Trigger autonomous AI bot scan
  const handleTriggerBotScan = async () => {
    try {
      setIsScanning(true);
      setBotFeedback(null);
      const generated = await triggerAINewsBotScan({
        university: selectedUniversity !== 'All' ? selectedUniversity : undefined,
        department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
        focusType: 'ALUMNI_ACHIEVEMENT',
        forceHotTopic: true,
        count: 2,
      });
      setBotFeedback(
        `✓ AI Bot rotated 24h wire: Indexed ${generated.length} fresh intelligence stories across institutions.`
      );
    } catch (err: any) {
      setBotFeedback(`Notice: ${err.message || 'Error communicating with AI bot wire.'}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => setBotFeedback(null), 6000);
    }
  };

  // Explicit 24-Hour Automated Cycle Rotation Trigger
  const handleTrigger24hRotation = async () => {
    try {
      setIsScanning(true);
      setBotFeedback(null);
      const generated = await trigger24HourRotationCycle();
      setBotFeedback(
        `✓ AI Bot successfully rotated 24h cycle: Indexed ${generated.length} fresh intelligence stories across institutions.`
      );
    } catch (err: any) {
      setBotFeedback(`Notice: ${err.message || 'Error executing 24h cycle rotation.'}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => setBotFeedback(null), 6000);
    }
  };

  // Run cleanup for expired temporary news (> 10 days old)
  const handleRunCleanup = async () => {
    try {
      setIsCleaning(true);
      const cleaned = await cleanupExpiredNews();
      setBotFeedback(
        cleaned > 0
          ? `✓ 10-day TTL routine complete: Purged ${cleaned} expired temporary news items without permanent admin locks.`
          : '✓ 10-day TTL routine checked: No expired temporary stories found.'
      );
    } catch (err: any) {
      setBotFeedback('Failed to run expiration cleanup.');
    } finally {
      setIsCleaning(false);
      setTimeout(() => setBotFeedback(null), 5000);
    }
  };

  // Handle news submission
  const handleSubmitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await createNewsArticle({
      title: newTitle.trim(),
      category: newCategory,
      summary: newSummary.trim(),
      content: newContent.trim(),
      imageUrl:
        newImageUrl.trim() ||
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      university: newUniversity,
      department: newDepartment,
      alumniPrizeName: newPrizeName.trim() || undefined,
      isHotTopic: canMakePermanent ? newIsHot : false,
      hotTopicReason: newIsHot ? 'Flagged as breaking milestone' : undefined,
      sourceUrl: newSourceUrl.trim() || undefined,
      sourceName: newSourceUrl.trim() ? 'Submitted Web Wire' : undefined,
      authorId: currentUser.uid,
      authorName: userProfile?.name || 'Network Member',
      status: canMakePermanent ? 'PUBLISHED' : 'PENDING_APPROVAL',
      isPermanent: canMakePermanent,
      expiresAt: canMakePermanent
        ? undefined
        : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      views: 1,
    });

    setShowSubmitModal(false);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewImageUrl('');
    setNewPrizeName('');
    setNewIsHot(false);
    setNewSourceUrl('');

    setBotFeedback(
      canMakePermanent
        ? '✓ News published live immediately with permanent institutional status.'
        : '✓ News submitted for administrator moderation review.'
    );
    setTimeout(() => setBotFeedback(null), 5000);
  };

  // Handle article deletion
  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    await deleteNewsArticle(
      articleToDelete.id,
      deleteReason || 'Administrative deletion by verified admin'
    );
    setArticleToDelete(null);
    setDeleteReason('');
    setBotFeedback('✓ Publication deleted and logged into Super Admin activity log.');
    setTimeout(() => setBotFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>AUTONOMOUS LIVE NEWS WIRE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black navy mt-2">
            University & Alumni Intelligence Network
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Live updates, alumni prize-winning achievements, groundbreaking research, and institutional bulletins across all universities and departments. Rotated every 24 hours by AI Bot.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-end flex-wrap">
          {currentUser && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit News Story</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Bot Control & 24h Rotation Deck */}
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-navy text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI WIRE BOT: ACTIVE & MONITORING</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Next 24h Rotation in: {timeRemaining24h.hours}h {timeRemaining24h.minutes}m
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              The AI bot constantly scans live web feeds for university achievements and prize-winning alumni. Temporary daily news rotates after <b>24 hours</b> and is permanently purged after <b>10 days</b>, unless verified by <b>Super Admin</b>, <b>University Admin</b>, or <b>Department Admin</b>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleTrigger24hRotation}
              disabled={isScanning}
              className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Execute full 24-hour cycle rotation with randomized university & department sampling"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Rotate 24h Cycle (Cycle #{botStatus.cycleCount})</span>
            </button>

            <button
              onClick={handleTriggerBotScan}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Trigger web browsing scan for currently selected university/department"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Scanning Live Web...' : 'Scan Web Wire'}</span>
            </button>

            {canMakePermanent && (
              <button
                onClick={handleRunCleanup}
                disabled={isCleaning}
                className="bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 font-bold text-xs px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Run background routine to purge temporary stories exceeding 10-day TTL"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{isCleaning ? 'Cleaning...' : 'Purge Expired (>10d)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback alert */}
        {botFeedback && (
          <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/40 rounded-xl text-xs text-blue-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-blue-300 shrink-0" />
            <span>{botFeedback}</span>
          </div>
        )}
      </div>

      {/* Breaking Hot Topics Stream */}
      {hotTopicsList.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
                <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-rose-700">
                🔥 BREAKING HOT TOPICS WIRE
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {hotTopicsList.length} instant priority item{hotTopicsList.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotTopicsList.slice(0, 3).map((article, idx) => (
              <div
                key={article.id || `hot-topic-${idx}-${article.title}`}
                className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50/40 border border-rose-300 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Flame className="w-3 h-3 text-rose-600" />
                      <span>HOT TOPIC</span>
                    </span>

                    {article.isPermanent ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>Permanent</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>10d TTL</span>
                      </span>
                    )}
                  </div>

                  {article.alumniPrizeName && (
                    <div className="mb-2 text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{article.alumniPrizeName}</span>
                    </div>
                  )}

                  <h3
                    onClick={() => onNavigate('newsDetail', { id: article.id })}
                    className="font-black text-slate-900 text-sm hover:text-rose-600 transition cursor-pointer leading-snug line-clamp-2"
                  >
                    {article.title}
                  </h3>

                  {article.hotTopicReason && (
                    <p className="text-[11px] font-bold text-rose-700 mt-1 line-clamp-1">
                      {article.hotTopicReason}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {article.summary || article.content.slice(0, 100) + '...'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400">
                    {article.university || 'Higher Education'}
                  </div>

                  <div className="flex items-center gap-2">
                    {canUserManageArticle(article) && (
                      <button
                        onClick={() => {
                          if (article.isPermanent) {
                            removeNewsPermanent(article.id);
                          } else {
                            makeNewsPermanent(article.id);
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                          article.isPermanent
                            ? 'bg-slate-50 text-slate-600 border-slate-300'
                            : 'bg-emerald-600 text-white border-emerald-700'
                        }`}
                        title="Designate permanent status"
                      >
                        {article.isPermanent ? 'Unpin' : 'Permanent'}
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('newsDetail', { id: article.id })}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Read →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar Deck */}
      <div className="card p-5 mt-8 border-soft shadow-sm space-y-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 border border-soft">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news by keywords, alumni award winners, breakthroughs, universities, departments..."
            className="flex-1 outline-none text-xs sm:text-sm bg-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown Selectors for University, Department & Retention */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Select University:
            </label>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full bg-white border border-soft rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Universities (Nationwide)</option>
              {universityList.map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Select Department:
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-white border border-soft rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departmentList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Retention Status:
            </label>
            <select
              value={selectedRetention}
              onChange={(e) => setSelectedRetention(e.target.value as any)}
              className="w-full bg-white border border-soft rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Lifecycles</option>
              <option value="PERMANENT">🛡️ Permanent Archive Only</option>
              <option value="EXPIRING">⏳ Temporary Stories (10d TTL)</option>
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-2 border-t border-soft">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`pill cursor-pointer whitespace-nowrap transition text-xs ${
              selectedCategory === 'All' ? 'bg-navy text-white border-navy font-bold' : 'text-slate-600'
            }`}
          >
            All Updates
          </button>
          <button
            onClick={() => setSelectedCategory('HOT_TOPICS')}
            className={`pill cursor-pointer whitespace-nowrap transition text-xs flex items-center gap-1 ${
              selectedCategory === 'HOT_TOPICS'
                ? 'bg-rose-600 text-white border-rose-600 font-bold'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Hot Topics Only</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`pill cursor-pointer whitespace-nowrap transition text-xs ${
                selectedCategory === cat ? 'bg-navy text-white border-navy font-bold' : 'text-slate-600'
              }`}
            >
              {cat === 'Alumni special achievements' ? '🏆 ' + cat : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main News Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
        {publishedList.map((article, idx) => {
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
              key={article.id || `live-news-${idx}-${article.title}`}
              className={`card overflow-hidden hover:-translate-y-1 transition duration-300 flex flex-col justify-between group bg-white shadow-sm hover:shadow-md ${
                article.isHotTopic
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : 'border-soft'
              }`}
            >
              <div>
                <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                  <img
                    src={
                      article.imageUrl ||
                      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'
                    }
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {article.isHotTopic && (
                      <span className="bg-rose-600 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] shadow flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 text-yellow-300" />
                        <span>HOT TOPIC</span>
                      </span>
                    )}

                    <span className="bg-white/95 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-blue-700 shadow-sm backdrop-blur">
                      {article.category}
                    </span>
                  </div>

                  {/* Retention status pill */}
                  <div className="absolute top-3 right-3">
                    {article.isPermanent ? (
                      <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur flex items-center gap-1 shadow-sm">
                        <Shield className="w-3 h-3 text-emerald-200" />
                        <span>Permanent</span>
                      </span>
                    ) : (
                      <span className="bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-300" />
                        <span>{daysLeft}d left</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {/* Institutional Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-2">
                    {article.university && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[140px]">{article.university}</span>
                      </span>
                    )}
                    {article.department && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-purple-400" />
                        <span className="truncate max-w-[120px]">{article.department}</span>
                      </span>
                    )}
                  </div>

                  {/* Prize Winning Badge */}
                  {article.alumniPrizeName && (
                    <div className="mb-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{article.alumniPrizeName}</span>
                    </div>
                  )}

                  <h3
                    onClick={() => onNavigate('newsDetail', { id: article.id })}
                    className="font-bold text-base navy line-clamp-2 leading-snug group-hover:text-blue-600 transition cursor-pointer"
                  >
                    {article.title}
                  </h3>

                  {article.isHotTopic && article.hotTopicReason && (
                    <p className="text-[11px] text-rose-700 font-bold mt-1 line-clamp-1">
                      {article.hotTopicReason}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {article.summary || article.content.slice(0, 120) + '...'}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="line my-3"></div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
                    {article.sourceUrl && (
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Source</span>
                      </a>
                    )}
                  </div>

                  {/* 3 Admin Types Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {canUserManageArticle(article) && (
                      <>
                        <button
                          onClick={() => {
                            if (article.isPermanent) {
                              removeNewsPermanent(article.id);
                            } else {
                              makeNewsPermanent(article.id);
                            }
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            article.isPermanent
                              ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                              : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                          }`}
                          title="Designate permanent status"
                        >
                          <Pin className="w-2.5 h-2.5" />
                          <span>{article.isPermanent ? 'Unpin' : 'Permanent'}</span>
                        </button>

                        <button
                          onClick={() => setArticleToDelete(article)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete news article"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onNavigate('newsDetail', { id: article.id })}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Read story →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {publishedList.length === 0 && (
        <div className="card p-12 text-center text-slate-400 mt-8 border-dashed border-slate-300">
          <Bot className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-base navy">No news articles match your selected filters.</p>
          <p className="text-xs mt-1 text-slate-500">
            Clear specific department/university filters or click "Scan Web Wire" to trigger fresh AI discovery.
          </p>
          <button
            onClick={handleTriggerBotScan}
            disabled={isScanning}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover News with AI Bot</span>
          </button>
        </div>
      )}

      {/* Submit News Story Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border-soft bg-white">
            <div className="flex items-start justify-between pb-3 border-b border-soft">
              <div>
                <h3 className="text-xl font-black navy">Submit News Story or Alumni Accolade</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish verified institutional updates, prize-winning accolades, and breakthroughs.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNews} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Article Title *</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="account-input"
                  placeholder="e.g. DU CSE Alumni Team Secures International AI Prize..."
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NewsCategory)}
                    className="account-input bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prize / Award Name (Optional)
                  </label>
                  <input
                    value={newPrizeName}
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    className="account-input"
                    placeholder="e.g. IEEE Fellow 2026, Gold Medal"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">University</label>
                  <input
                    value={newUniversity}
                    onChange={(e) => setNewUniversity(e.target.value)}
                    className="account-input"
                    placeholder="e.g. University of Dhaka"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="account-input"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>

              {canMakePermanent && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="markLiveHot"
                    checked={newIsHot}
                    onChange={(e) => setNewIsHot(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="markLiveHot" className="text-xs font-bold text-rose-900 cursor-pointer">
                    🔥 Mark as Instant HOT TOPIC (featured prominently on live breaking wire)
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Web Source URL</label>
                <input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="account-input"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Summary *</label>
                <input
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="account-input"
                  placeholder="1-2 sentences summarizing key impact"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Story Content *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  className="account-input"
                  placeholder="Detailed background, alumni contributors, and significance..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Publish Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Article Confirmation Modal */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl border-soft bg-white">
            <h3 className="text-lg font-black navy">Confirm Article Deletion</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to permanently delete "{articleToDelete.title}"? This administrative action will be recorded in the forensic Activity Log.
            </p>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Deletion Reason
              </label>
              <input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Outdated announcement, false report..."
                className="w-full border border-soft rounded-xl px-3 py-2 text-xs outline-none bg-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Delete Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
