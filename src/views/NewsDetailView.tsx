import React from 'react';
import { useData } from '../context/DataContext';

interface NewsDetailViewProps {
  articleId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const NewsDetailView: React.FC<NewsDetailViewProps> = ({ articleId, onNavigate }) => {
  const { news } = useData();

  const article = news.find((n) => n.id === articleId) || news[0];

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-12 text-center">
        <h2 className="text-2xl font-bold navy">Article not found</h2>
        <button
          onClick={() => onNavigate('news')}
          className="mt-4 pill text-blue-600 bg-blue-50 border-blue-200"
        >
          ← Return to Live News
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <button
        onClick={() => onNavigate('news')}
        className="text-sm text-slate-500 hover:text-slate-800 transition mb-6 flex items-center gap-1"
      >
        <span>← Back to all news</span>
      </button>

      <div className="card p-6 sm:p-10 shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="pill text-blue-700 bg-blue-50 font-bold text-xs border-blue-200">
            {article.category}
          </span>
          {article.university && (
            <span className="pill text-slate-600 text-xs">
              {article.university}
            </span>
          )}
          {article.featured && (
            <span className="pill text-amber-600 bg-amber-50 font-bold text-xs border-amber-200">
              ★ Featured
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black navy leading-tight">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 pb-6 border-b border-soft">
          <div>
            By <b className="navy">{article.authorName}</b>
          </div>
          <span>•</span>
          <div>
            Published: {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          {article.views && (
            <>
              <span>•</span>
              <div>{article.views.toLocaleString()} readers</div>
            </>
          )}
        </div>

        {article.imageUrl && (
          <div className="my-8 rounded-2xl overflow-hidden shadow-md max-h-[440px] bg-slate-100">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {article.summary && (
          <div className="p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl my-6 text-sm text-slate-700 font-medium italic leading-relaxed">
            {article.summary}
          </div>
        )}

        <div className="text-slate-700 text-base leading-8 space-y-6 mt-6 whitespace-pre-line font-normal">
          {article.content}
        </div>

        {/* Footer info box */}
        <div className="mt-12 pt-6 border-t border-soft flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div>
            {article.department && <span>Department: {article.department} · </span>}
            AlumniSphere Verified News Service
          </div>
          <button
            onClick={() => onNavigate('news')}
            className="text-blue-600 font-bold hover:underline"
          >
            ← Explore more updates
          </button>
        </div>
      </div>
    </div>
  );
};
