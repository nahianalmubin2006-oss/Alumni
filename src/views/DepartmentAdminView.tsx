import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface DepartmentAdminViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DepartmentAdminView: React.FC<DepartmentAdminViewProps> = ({ onNavigate }) => {
  const { isDepartmentAdmin, userProfile } = useAuth();
  const { alumni, students, submitChangeRequest } = useData();

  const assignedUni =
    userProfile?.assignedUniversity ||
    userProfile?.university ||
    'University of Dhaka';
  const assignedDept =
    userProfile?.assignedDepartment ||
    userProfile?.department ||
    'Computer Science & Engineering';

  const deptAlumni = alumni.filter(
    (a) =>
      a.university.toLowerCase() === assignedUni.toLowerCase() &&
      a.department.toLowerCase() === assignedDept.toLowerCase()
  );

  const deptStudents = students.filter(
    (s) =>
      s.university.toLowerCase() === assignedUni.toLowerCase() &&
      s.department.toLowerCase() === assignedDept.toLowerCase()
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'change'>('overview');
  const [achievements, setAchievements] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isDepartmentAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="card p-10">
          <h2 className="text-2xl font-black navy">Restricted Department Admin Area</h2>
          <p className="text-sm text-slate-500 mt-2">
            You are not assigned as a Department Administrator.
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

  const handleProposeDeptChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitChangeRequest({
        requesterId: userProfile?.uid || 'dept-admin',
        requesterName: userProfile?.name || 'Department Administrator',
        requesterEmail: userProfile?.email || '',
        requesterRole: 'DEPARTMENT_ADMIN',
        targetType: 'DEPARTMENT',
        targetId: 'dept-' + encodeURIComponent(assignedDept.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        targetTitle: `${assignedDept} (${assignedUni})`,
        university: assignedUni,
        department: assignedDept,
        oldValue: JSON.stringify({ achievements: 'Baseline curriculum' }),
        newValue: JSON.stringify({ achievements }),
        reason: reason || 'Updated research benchmarks and achievements.',
      });
      setMsg('Change request submitted to Super Admin for approval!');
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
            DEPARTMENT ADMINISTRATOR WORKSPACE
          </div>
          <h1 className="text-3xl font-black navy mt-1">{assignedDept}</h1>
          <p className="text-slate-500 mt-1 text-sm">{assignedUni}</p>
        </div>

        <button
          onClick={() =>
            onNavigate('departmentProfile', {
              dept: assignedDept,
              uni: assignedUni,
            })
          }
          className="pill text-blue-600 self-start md:self-end"
        >
          View Department Profile →
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
          <span className="text-xs text-slate-400 block">Department Alumni</span>
          <b className="text-2xl navy mt-1 block">{deptAlumni.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Current Students</span>
          <b className="text-2xl navy mt-1 block">{deptStudents.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Tracked Batches</span>
          <b className="text-2xl navy mt-1 block">6 cohorts</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Employment Target</span>
          <b className="text-2xl text-emerald-600 mt-1 block">85%</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-2 border-b border-soft pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pill cursor-pointer ${activeTab === 'overview' ? 'bg-navy text-white' : ''}`}
        >
          Overview & Members
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pill cursor-pointer ${activeTab === 'batches' ? 'bg-navy text-white' : ''}`}
        >
          Batches (2020–2025)
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`pill cursor-pointer ${activeTab === 'change' ? 'bg-navy text-white' : ''}`}
        >
          Submit Changes
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">Department Members Directory</h3>
          <div className="divide-y divide-soft">
            {[...deptAlumni, ...deptStudents].length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No registered student or alumni members for this department yet.
              </div>
            ) : (
              [...deptAlumni, ...deptStudents].map((m: any) => (
                <div key={m.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{m.name}</b>
                    <span className="text-slate-500">
                      {m.jobRole || m.studentYear} · {m.company || m.expectedGraduation}
                    </span>
                  </div>
                  <span className="pill text-[10px]">{m.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Batches */}
      {activeTab === 'batches' && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {['2020', '2021', '2022', '2023', '2024', '2025'].map((yr) => (
            <button
              key={yr}
              onClick={() =>
                onNavigate('departmentBatch', {
                  dept: assignedDept,
                  uni: assignedUni,
                  batch: yr,
                })
              }
              className="card p-4 text-center hover:border-blue-400 transition"
            >
              <b className="navy text-lg block">{yr}</b>
              <span className="text-[11px] text-slate-400 block mt-1">Cohort Batch</span>
              <span className="text-xs text-blue-600 font-bold block mt-2">Manage →</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab: Change */}
      {activeTab === 'change' && (
        <div className="mt-6 card p-6 sm:p-8 shadow-xl max-w-2xl">
          <h3 className="text-xl font-black navy">Propose Department Information</h3>
          <p className="text-xs text-slate-500 mt-1">
            Department updates require Super Admin approval prior to publication.
          </p>

          <form onSubmit={handleProposeDeptChange} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Achievements & Milestones</label>
              <textarea
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={4}
                className="account-input mt-1"
                placeholder="e.g. ACM ICPC regional finalists, patent filings..."
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Reason for Update</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-input mt-1"
                placeholder="e.g. Annual department outcome verification"
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
