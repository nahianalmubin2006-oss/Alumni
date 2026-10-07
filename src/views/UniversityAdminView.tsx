import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface UniversityAdminViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const UniversityAdminView: React.FC<UniversityAdminViewProps> = ({ onNavigate }) => {
  const { isUniversityAdmin, userProfile } = useAuth();
  const { universities, alumni, students, news, submitChangeRequest } = useData();

  const assignedUniName =
    userProfile?.assignedUniversity || 'Bangladesh University of Professionals';

  const university = universities.find(
    (u) => u.name.toLowerCase() === assignedUniName.toLowerCase()
  ) || {
    name: assignedUniName,
    location: 'Dhaka, Bangladesh',
    alumniCount: 2840,
    employmentRate: 84,
    overview: 'Flagship higher education institution profile.',
  };

  const uniAlumni = alumni.filter(
    (a) => a.university.toLowerCase() === assignedUniName.toLowerCase()
  );
  const uniStudents = students.filter(
    (s) => s.university.toLowerCase() === assignedUniName.toLowerCase()
  );
  const uniNews = news.filter(
    (n) => n.university?.toLowerCase() === assignedUniName.toLowerCase()
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'alumni' | 'students' | 'change'>('overview');
  const [proposedOverview, setProposedOverview] = useState(university.overview || '');
  const [proposedLocation, setProposedLocation] = useState(university.location || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isUniversityAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="card p-10">
          <h2 className="text-2xl font-black navy">Restricted University Admin Area</h2>
          <p className="text-sm text-slate-500 mt-2">
            You are not currently assigned as a University Administrator.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="mt-6 bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            ← Return to Explore
          </button>
        </div>
      </div>
    );
  }

  const handleProposeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitChangeRequest({
        requesterId: userProfile?.uid || 'uni-admin',
        requesterName: userProfile?.name || 'University Administrator',
        requesterEmail: userProfile?.email || '',
        requesterRole: 'UNIVERSITY_ADMIN',
        targetType: 'UNIVERSITY',
        targetId: (university as any).id || 'uni-target',
        targetTitle: university.name,
        university: university.name,
        oldValue: JSON.stringify({ overview: university.overview, location: university.location }),
        newValue: JSON.stringify({ overview: proposedOverview, location: proposedLocation }),
        reason: reason || 'Proposed factual profile update.',
      });
      setMsg('Change request submitted to Super Admin! Check notifications for review decisions.');
    } catch (err: any) {
      setMsg('Failed to submit change request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            UNIVERSITY ADMINISTRATOR WORKSPACE
          </div>
          <h1 className="text-3xl font-black navy mt-1">{university.name}</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Institutional management scope restricted to {university.name}.
          </p>
        </div>

        <button
          onClick={() => onNavigate('universityDetail', { name: university.name })}
          className="pill text-blue-600 self-start md:self-end"
        >
          View Public Page →
        </button>
      </div>

      {msg && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        <div className="metric">
          <span className="text-xs text-slate-400 block">Enrolled Students</span>
          <b className="text-2xl navy mt-1 block">{uniStudents.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Registered Alumni</span>
          <b className="text-2xl navy mt-1 block">{uniAlumni.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Published News</span>
          <b className="text-2xl navy mt-1 block">{uniNews.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Employment Index</span>
          <b className="text-2xl text-emerald-600 mt-1 block">{university.employmentRate}%</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-2 border-b border-soft pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pill cursor-pointer ${activeTab === 'overview' ? 'bg-navy text-white' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`pill cursor-pointer ${activeTab === 'alumni' ? 'bg-navy text-white' : ''}`}
        >
          Alumni Directory ({uniAlumni.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pill cursor-pointer ${activeTab === 'students' ? 'bg-navy text-white' : ''}`}
        >
          Students ({uniStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`pill cursor-pointer ${activeTab === 'change' ? 'bg-navy text-white' : ''}`}
        >
          Submit Information Change
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="mt-6 card p-6 shadow-xl space-y-4">
          <h3 className="font-bold navy text-lg">Institutional Information</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{university.overview}</p>
          <div className="text-xs text-slate-400 pt-4 border-t border-soft">
            Location: {university.location}
          </div>
        </div>
      )}

      {/* Tab: Alumni */}
      {activeTab === 'alumni' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">University Alumni Records</h3>
          {uniAlumni.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No alumni records yet.</div>
          ) : (
            <div className="divide-y divide-soft">
              {uniAlumni.map((a) => (
                <div key={a.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{a.name}</b>
                    <span className="text-slate-500">
                      {a.department} · {a.jobRole} at {a.company} ({a.country})
                    </span>
                  </div>
                  <span className="pill text-[10px]">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Students */}
      {activeTab === 'students' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">Enrolled Students</h3>
          {uniStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No registered students yet.</div>
          ) : (
            <div className="divide-y divide-soft">
              {uniStudents.map((s) => (
                <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{s.name}</b>
                    <span className="text-slate-500">
                      {s.department} · {s.studentYear} · Expected: {s.expectedGraduation}
                    </span>
                  </div>
                  <span className="pill text-[10px]">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Change Request */}
      {activeTab === 'change' && (
        <div className="mt-6 card p-6 sm:p-8 shadow-xl max-w-2xl">
          <h3 className="text-xl font-black navy">Propose University Information Change</h3>
          <p className="text-xs text-slate-500 mt-1">
            Protected public information requires Super Admin approval before updating.
          </p>

          <form onSubmit={handleProposeChange} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Location</label>
              <input
                value={proposedLocation}
                onChange={(e) => setProposedLocation(e.target.value)}
                className="account-input mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Institution Overview / Vision</label>
              <textarea
                value={proposedOverview}
                onChange={(e) => setProposedOverview(e.target.value)}
                rows={4}
                className="account-input mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Reason for Update</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-input mt-1"
                placeholder="e.g. Updated strategic research facilities and campus location"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              {submitting ? 'Submitting...' : 'Submit to Super Admin'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
