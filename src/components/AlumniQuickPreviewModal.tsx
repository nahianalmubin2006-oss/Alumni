import React, { useEffect } from 'react';
import {
  X,
  ExternalLink,
  Building2,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  CheckCircle2,
  Handshake,
  UserPlus,
  Clock,
  Award,
} from 'lucide-react';
import { AlumniRecord } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface AlumniQuickPreviewModalProps {
  alumnus: AlumniRecord | null;
  onClose: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onRequestConnect?: (alumnus: AlumniRecord) => void;
  onRequestMentorship?: (alumnus: AlumniRecord) => void;
}

export const AlumniQuickPreviewModal: React.FC<AlumniQuickPreviewModalProps> = ({
  alumnus,
  onClose,
  onNavigate,
  onRequestConnect,
  onRequestMentorship,
}) => {
  const { currentUser } = useAuth();
  const { getConnectionStatusWith, getMentorshipStatusWith } = useData();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!alumnus) return null;

  const initials = alumnus.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isOwnProfile = Boolean(
    currentUser &&
      (currentUser.uid.toLowerCase() === (alumnus.userId || alumnus.id).toLowerCase() ||
        currentUser.uid.toLowerCase() === alumnus.id.toLowerCase())
  );

  const connStatus = getConnectionStatusWith(alumnus.userId || alumnus.id);
  const mentorStatus = getMentorshipStatusWith(alumnus.userId || alumnus.id);

  const displayYear = alumnus.graduationYear || alumnus.batch || '—';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-preview-title"
    >
      <div
        className="card max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Cover Banner Header */}
        <div className="h-28 sm:h-36 relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.3),transparent)]" />
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <span className="text-[11px] font-bold text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
              Quick Preview
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {alumnus.university && (
            <div className="absolute bottom-3 left-4 text-xs font-semibold text-white/90 truncate max-w-[280px]">
              {alumnus.university}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Avatar and Identity */}
          <div className="flex items-start gap-4 -mt-12 sm:-mt-14 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 ring-4 ring-white dark:ring-slate-900 shadow-xl shrink-0 overflow-hidden">
              {alumnus.photoUrl ? (
                <img
                  src={alumnus.photoUrl}
                  alt={alumnus.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full items-center justify-center font-black text-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 rounded-xl ${
                  alumnus.photoUrl ? 'hidden' : 'flex'
                }`}
              >
                {initials}
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-6 sm:pt-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="quick-preview-title" className="text-lg sm:text-xl font-black navy dark:text-white truncate">
                  {alumnus.name}
                </h3>
                {alumnus.isVerified && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
                {alumnus.mentorshipOpen !== false && (
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                    <Handshake className="w-3 h-3 text-blue-600" />
                    <span>Mentor</span>
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  {alumnus.jobRole || 'Professional'} {alumnus.company ? `at ${alumnus.company}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Academic & Location Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faculty & Discipline</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate mt-0.5" title={alumnus.department}>
                {alumnus.department}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Class of {displayYear}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location / Chapter</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                {alumnus.city ? `${alumnus.city}, ` : ''}{alumnus.country || 'Global'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {alumnus.sector || 'Industry Placement'}
              </span>
            </div>
          </div>

          {/* Bio statement if present */}
          {alumnus.bio && (
            <div className="p-3 rounded-xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
              &ldquo;{alumnus.bio}&rdquo;
            </div>
          )}

          {/* Skills / Specializations */}
          {alumnus.skills && alumnus.skills.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Areas of Expertise & Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {alumnus.skills.slice(0, 6).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate('alumniProfile', { id: alumnus.id, name: alumnus.name });
            }}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Full Detailed Dossier</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            {!isOwnProfile && alumnus.mentorshipOpen !== false && mentorStatus.status === 'NONE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onRequestMentorship) {
                    onRequestMentorship(alumnus);
                  } else {
                    onNavigate('alumniProfile', { id: alumnus.id, name: alumnus.name });
                  }
                }}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Mentorship</span>
              </button>
            )}

            {!isOwnProfile && connStatus.status === 'NONE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onRequestConnect) {
                    onRequestConnect(alumnus);
                  } else {
                    onNavigate('alumniProfile', { id: alumnus.id, name: alumnus.name });
                  }
                }}
                className="text-xs font-bold text-white bg-navy hover:bg-slate-800 px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-300" />
                <span>Connect</span>
              </button>
            )}

            {!isOwnProfile && connStatus.status === 'PENDING' && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending</span>
              </span>
            )}

            {!isOwnProfile && connStatus.status === 'ACCEPTED' && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
