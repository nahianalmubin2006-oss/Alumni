import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  Award,
  Shield,
  Clock,
  ExternalLink,
  Pin,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface NewsDetailViewProps {
  articleId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const NewsDetailView: React.FC<NewsDetailViewProps> = ({ articleId, onNavigate }) => {
  const { news, makeNewsPermanent, removeNewsPermanent, deleteNewsArticle, canUserManageArticle } = useData();
  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const article = news.find((n) => n.id === articleId) || news[0];

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-12 text-center">
        <h2 className="text-2xl font-bold navy">Article not found</h2>
        <button
          onClick={() => onNavigate('news')}
          className="mt-4 pill text-blue-600 bg-blue-50 border-blue-200 cursor-pointer"
        >
          ← Return to Live News
        </button>
      </div>
    );
  }

  // Check if current user is one of the 3 types of admins
  const canMakePermanent =
    isSuperAdmin ||
    userProfile?.role === 'SUPER_ADMIN' ||
    userProfile?.role === 'UNIVERSITY_ADMIN' ||
    userProfile?.role === 'DEPARTMENT_ADMIN';

  const daysLeft = article.expiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(article.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const handleDelete = async () => {
    await deleteNewsArticle(article.id, deleteReason || 'Manual deletion by Admin');
    setConfirmDelete(false);
    onNavigate('news');
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate('news')}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live News Wire</span>
        </button>

        {/* Admin Controls */}
        {canUserManageArticle(article) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (article.isPermanent) {
                  removeNewsPermanent(article.id);
                } else {
                  makeNewsPermanent(article.id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                article.isPermanent
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
              title="Super Admin, University Admin, and Department Admin can designate permanent status"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{article.isPermanent ? 'Permanent (Click to Unpin)' : 'Make Permanent'}</span>
            </button>

            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Breaking Hot Topic Banner */}
      {article.isHotTopic && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 text-white shadow-lg flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-xl shrink-0 mt-0.5">
            <Flame className="w-6 h-6 text-yellow-200 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                🔥 BREAKING HOT TOPIC
              </span>
              {article.isAiGenerated && (
                <span className="text-[11px] bg-black/25 px-2 py-0.5 rounded-full font-semibold">
                  Auto-Flagged by AI Bot
                </span>
              )}
            </div>
            <p className="text-sm font-bold mt-1 text-white">
              {article.hotTopicReason || 'High-impact breakthrough flagged for immediate live wire syndication across all departments.'}
            </p>
          </div>
        </div>
      )}

      {/* Special Alumni Achievement / Prize Banner */}
      {article.alumniPrizeName && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
            <Award className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 block">
              🏆 ALUMNI SPECIAL ACHIEVEMENT / HONORS
            </span>
            <p className="text-sm font-bold text-amber-950">
              {article.alumniPrizeName}
            </p>
          </div>
        </div>
      )}

      <div className="card p-6 sm:p-10 shadow-xl overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill text-blue-700 bg-blue-50 font-bold text-xs border-blue-200">
              {article.category}
            </span>
            {article.university && (
              <span className="pill text-slate-700 bg-slate-100 text-xs font-semibold flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" />
                {article.university}
              </span>
            )}
            {article.department && (
              <span className="pill text-purple-700 bg-purple-50 text-xs font-semibold flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-purple-500" />
                {article.department}
              </span>
            )}
          </div>

          {/* Retention & Lifecycle Badge */}
          <div>
            {article.isPermanent ? (
              <span
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 shadow-xs"
                title={
                  article.permanentBy
                    ? `Made permanent by ${article.permanentBy.role} ${article.permanentBy.userName} on ${new Date(
                        article.permanentBy.at
                      ).toLocaleDateString()}`
                    : 'Permanent archive'
                }
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Permanent Archive</span>
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200"
                title="Temporary story: auto-deletes after 10 days unless pinned permanent"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Expires in {daysLeft} days (10d TTL)</span>
              </span>
            )}
          </div>
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
            Published:{' '}
            {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
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

          {article.sourceUrl && (
            <>
              <span>•</span>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Web Source: {article.sourceName || 'Online Wire'}</span>
              </a>
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

        {/* Permanence metadata notice if applicable */}
        {article.isPermanent && article.permanentBy && (
          <div className="mt-8 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <b>Permanence Endorsement:</b> Made permanent by <b>{article.permanentBy.role.replace('_', ' ')} {article.permanentBy.userName}</b> on {new Date(article.permanentBy.at).toLocaleDateString()}. Protected from the 10-day auto-purge routine.
            </span>
          </div>
        )}

        {/* Footer info box */}
        <div className="mt-12 pt-6 border-t border-soft flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div>
            {article.department && <span>Department: {article.department} · </span>}
            AlumniSphere Verified News Service
          </div>
          <button
            onClick={() => onNavigate('news')}
            className="text-blue-600 font-bold hover:underline cursor-pointer"
          >
            ← Explore more updates
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl border-soft bg-white">
            <h3 className="text-lg font-black navy">Delete News Article</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to permanently delete "{article.title}"? This administrative action will be recorded in the Activity Log.
            </p>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Deletion Reason
              </label>
              <input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Expired event, inaccurate information..."
                className="w-full border border-soft rounded-xl px-3 py-2 text-xs outline-none bg-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
