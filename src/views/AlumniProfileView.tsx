import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { AlumniRecord } from '../types';

interface AlumniProfileViewProps {
  alumniId?: string;
  alumniName?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const AlumniProfileView: React.FC<AlumniProfileViewProps> = ({
  alumniId,
  alumniName,
  onNavigate,
}) => {
  const { alumni } = useData();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);

  // Find alumni record or generate rich profile
  const profile: AlumniRecord = useMemo(() => {
    if (alumniId) {
      const match = alumni.find((a) => a.id === alumniId);
      if (match) return match;
    }
    if (alumniName) {
      const match = alumni.find((a) => a.name.toLowerCase() === alumniName.toLowerCase());
      if (match) return match;
    }

    // Default to the platform creator / user profile
    const userMatch = alumni.find(
      (a) => a.email === 'nahianalmubin2006@gmail.com' || a.id === 'alumni-nahian-al-mubin'
    );
    if (userMatch) return userMatch;

    return (
      alumni[0] || {
        id: 'alumni-nahian-al-mubin',
        userId: 'admin_nahianalmubin',
        name: 'Nahian Al Mubin',
        email: 'nahianalmubin2006@gmail.com',
        university: 'Bangladesh University of Professionals',
        department: 'Computer Science & Engineering',
        batch: '2026',
        graduationYear: '2026',
        jobRole: 'Software Developer & Platform Creator',
        company: 'AlumniSphere',
        country: 'Bangladesh',
        city: 'Dhaka',
        bio: 'Creator of AlumniSphere. BUP CSE student connecting students and graduates across Bangladesh.',
        linkedin: 'https://linkedin.com/in/nahianalmubin',
        isVerified: true,
        status: 'APPROVED',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
    );
  }, [alumni, alumniId, alumniName]);

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSendConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setConnected(true);
    setTimeout(() => {
      setConnectModalOpen(false);
      setConnected(false);
      setMessage('');
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <button
        onClick={() => onNavigate('alumni')}
        className="text-sm text-slate-500 hover:text-slate-800 transition mb-6 flex items-center gap-1"
      >
        <span>← Back to Alumni directory</span>
      </button>

      <div className="card p-7 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-24 h-24 rounded-3xl avatar flex items-center justify-center text-3xl font-black shadow-md shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black navy">{profile.name}</h1>
                {profile.isVerified ? (
                  <span className="pill text-emerald-600 bg-emerald-50 border-emerald-200">
                    ✓ Alumni verified
                  </span>
                ) : (
                  <span className="pill text-slate-500">Alumni member</span>
                )}
              </div>
              <p className="text-slate-600 font-semibold mt-1">
                {profile.jobRole} · {profile.company}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {profile.city ? `${profile.city}, ` : ''}
                {profile.country} · {profile.university} · {profile.department} ({profile.graduationYear || profile.batch})
              </p>

              {profile.bio && (
                <p className="text-xs text-slate-500 mt-3 max-w-xl leading-relaxed italic">
                  "{profile.bio}"
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="pill text-xs">Software Engineering</span>
                <span className="pill text-xs">Cloud Architecture</span>
                <span className="pill text-xs">Distributed Systems</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => setConnectModalOpen(true)}
              className="bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow"
            >
              Connect
            </button>
            {profile.linkedin && (
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-center px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
              >
                LinkedIn Profile ↗
              </a>
            )}
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="metric">
            <div className="text-xs text-slate-400">Experience</div>
            <b className="text-xl navy mt-1 block">3+ years</b>
          </div>
          <div className="metric">
            <div className="text-xs text-slate-400">Current location</div>
            <b className="text-xl navy mt-1 block">
              {profile.city ? `${profile.city}, ` : ''}
              {profile.country}
            </b>
          </div>
          <div className="metric">
            <div className="text-xs text-slate-400">Institutional Verification</div>
            <b
              className={`text-xl mt-1 block ${
                profile.isVerified ? 'text-emerald-600' : 'text-slate-600'
              }`}
            >
              {profile.isVerified ? 'Verified by Admin' : 'Self-declared'}
            </b>
          </div>
        </div>

        {/* Career Journey Timeline */}
        <div className="mt-10">
          <h2 className="text-xl font-black navy">Career journey</h2>
          <div className="mt-6 border-l-2 border-blue-100 ml-3 pl-7 space-y-8">
            <div>
              <div className="text-xs font-bold text-blue-600">2026 — PRESENT</div>
              <b className="block mt-1 navy text-base">
                {profile.jobRole} · {profile.company}
              </b>
              <p className="text-sm text-slate-500 mt-1">
                {profile.city ? `${profile.city}, ` : ''}
                {profile.country}
              </p>
            </div>

            <div>
              <div className="text-xs font-bold text-blue-600">2024 — 2026</div>
              <b className="block mt-1 navy text-base">Software Engineer · Technology Labs</b>
              <p className="text-sm text-slate-500 mt-1">Dhaka, Bangladesh</p>
            </div>

            <div>
              <div className="text-xs font-bold text-blue-600">
                {profile.graduationYear || '2023'}
              </div>
              <b className="block mt-1 navy text-base">
                BSc in {profile.department}
              </b>
              <p className="text-sm text-slate-500 mt-1">{profile.university}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl">
            {connected ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                  ✓
                </div>
                <h3 className="text-xl font-black navy">Invitation Sent!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {profile.name} will be notified with your profile and message.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black navy">Connect with {profile.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Send a professional introduction or alumni mentorship request.
                </p>

                <form onSubmit={handleSendConnection} className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Your message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="account-input mt-1"
                      placeholder="Hi Ahmed, I am a CSE student interested in your cloud journey..."
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                    <button
                      type="button"
                      onClick={() => setConnectModalOpen(false)}
                      className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                    >
                      Send Request
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
