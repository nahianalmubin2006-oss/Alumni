import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NewsCategory, NewsArticle } from '../types';

interface LiveNewsViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const CATEGORIES: NewsCategory[] = [
  'University announcements',
  'Department announcements',
  'Alumni achievements',
  'Events',
  'Scholarships',
  'Jobs',
  'Research',
  'General education news',
];

export const LiveNewsView: React.FC<LiveNewsViewProps> = ({ onNavigate }) => {
  const { news, createNewsArticle } = useData();
  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form states for submitting news
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<NewsCategory>('University announcements');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newUniversity, setNewUniversity] = useState(userProfile?.university || '');
  const [newDepartment, setNewDepartment] = useState(userProfile?.department || '');

  // Filter published news
  const publishedList = useMemo(() => {
    return news
      .filter((n) => n.status === 'PUBLISHED')
      .filter((n) => {
        const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
        const hay = [n.title, n.summary, n.content, n.category, n.university, n.department]
          .join(' ')
          .toLowerCase();
        const matchesSearch = !search || hay.includes(search.trim().toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
  }, [news, selectedCategory, search]);

  const featuredArticle = publishedList.find((n) => n.featured) || publishedList[0];
  const regularArticles = publishedList.filter((n) => n.id !== featuredArticle?.id);

  const handleSubmitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Super admin or approved university admin can publish directly; regular students/alumni submit for approval
    const canDirectPublish =
      isSuperAdmin ||
      userProfile?.role === 'UNIVERSITY_ADMIN' ||
      userProfile?.role === 'DEPARTMENT_ADMIN';

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
      authorId: currentUser.uid,
      authorName: userProfile?.name || 'Network Member',
      status: canDirectPublish ? 'PUBLISHED' : 'PENDING_APPROVAL',
      views: 1,
    });

    setShowSubmitModal(false);
    // Reset form
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewImageUrl('');

    alert(
      canDirectPublish
        ? 'News published live immediately!'
        : 'News submitted for administrator review!'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            LIVE NEWS WIRE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">
            University & Alumni Intelligence News
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Official announcements, groundbreaking research, alumni achievements, international
            scholarships, and career opportunities from across all institutions.
          </p>
        </div>

        {currentUser && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-navy text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow self-start md:self-end"
          >
            + Submit News Story
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`pill cursor-pointer whitespace-nowrap transition ${
            selectedCategory === 'All' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          All Updates
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`pill cursor-pointer whitespace-nowrap transition ${
              selectedCategory === cat ? 'bg-navy text-white border-navy' : 'text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="card p-3.5 mt-5">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 pl-2">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news by keywords, universities, research..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Featured Headline */}
      {featuredArticle && !search && selectedCategory === 'All' && (
        <div
          onClick={() => onNavigate('newsDetail', { id: featuredArticle.id })}
          className="card overflow-hidden mt-8 grid md:grid-cols-[1.2fr_1fr] hover:-translate-y-1 transition cursor-pointer group shadow-xl"
        >
          <div className="h-64 sm:h-80 md:h-full bg-slate-100 overflow-hidden relative">
            <img
              src={
                featuredArticle.imageUrl ||
                'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'
              }
              alt={featuredArticle.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            <span className="absolute top-4 left-4 bg-navy/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur">
              ★ FEATURED STORY
            </span>
          </div>

          <div className="p-7 md:p-9 flex flex-col justify-between">
            <div>
              <span className="pill text-blue-600 text-xs">{featuredArticle.category}</span>
              <h2 className="text-2xl sm:text-3xl font-black navy mt-3 leading-snug group-hover:text-blue-600 transition">
                {featuredArticle.title}
              </h2>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed line-clamp-3">
                {featuredArticle.summary || featuredArticle.content.slice(0, 180) + '...'}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-soft flex items-center justify-between text-xs text-slate-400">
              <div>
                <b className="navy block text-xs">{featuredArticle.authorName}</b>
                <span>{new Date(featuredArticle.createdAt).toLocaleDateString()}</span>
              </div>
              <span className="text-blue-600 font-bold group-hover:translate-x-1 transition text-sm">
                Read full article →
              </span>
            </div>
          </div>
        </div>
      )}

      {/* News Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {regularArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => onNavigate('newsDetail', { id: article.id })}
            className="card overflow-hidden hover:-translate-y-1 transition cursor-pointer flex flex-col justify-between group"
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
                <span className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded-full text-[11px] font-bold text-blue-700 shadow-sm backdrop-blur">
                  {article.category}
                </span>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-base navy line-clamp-2 leading-snug group-hover:text-blue-600 transition">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {article.summary || article.content.slice(0, 120) + '...'}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="line my-3"></div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                <span className="text-blue-600 font-semibold group-hover:translate-x-1 transition">
                  Read story →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {publishedList.length === 0 && (
        <div className="card p-12 text-center text-slate-400 mt-8">
          <p className="font-semibold text-base">No news found for this filter.</p>
          <p className="text-xs mt-1">Try selecting another category or clear your search query.</p>
        </div>
      )}

      {/* Submit News Story Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black navy">Submit News Story</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Share verified achievements, institutional events, or opportunities.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNews} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Article Title *</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. University Researchers Win International Innovation Award"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NewsCategory)}
                    className="account-input mt-1 bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Cover Image URL</label>
                  <input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="account-input mt-1"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Short Summary *</label>
                <input
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="account-input mt-1"
                  placeholder="A concise 1-2 sentence overview..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Full Article Content *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={5}
                  className="account-input mt-1"
                  placeholder="Detailed article body text..."
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Affiliated University</label>
                  <input
                    value={newUniversity}
                    onChange={(e) => setNewUniversity(e.target.value)}
                    className="account-input mt-1"
                    placeholder="e.g. University of Dhaka, BUET, etc."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Department</label>
                  <input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="account-input mt-1"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Submit Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
