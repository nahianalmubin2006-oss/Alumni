import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { universityInitials, demoSeed } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface DepartmentProfileViewProps {
  departmentName: string;
  universityName: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DepartmentProfileView: React.FC<DepartmentProfileViewProps> = ({
  departmentName,
  universityName,
  onNavigate,
}) => {
  const { currentUser, userProfile, isSuperAdmin } = useAuth();
  const { submitChangeRequest } = useData();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editAchievements, setEditAchievements] = useState('');

  // Generate dynamic stats based on department and university
  const seed = demoSeed(universityName + '|' + departmentName);
  const alumni = 120 + (seed % 720);
  const employment = 75 + (seed % 19);
  const higher = 6 + ((seed >> 3) % 12);
  const countries = 7 + ((seed >> 5) % 20);
  const companies = 35 + ((seed >> 7) % 120);

  const careers: Record<string, number> = {
    'Technology & Software': 32 + (seed % 15),
    'Government & Public Sector': 12 + ((seed >> 4) % 10),
    'Finance & Banking': 10 + ((seed >> 7) % 9),
    'Research & Higher Education': 9 + ((seed >> 10) % 8),
    'Healthcare & Industry': 6 + ((seed >> 13) % 7),
    'Consulting & Other': 9 + ((seed >> 16) % 8),
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: Object.keys(careers),
        datasets: [
          {
            data: Object.values(careers),
            backgroundColor: [
              '#2563eb',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#ec4899',
              '#64748b',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [departmentName, universityName]);

  const isThisDeptAdmin =
    isSuperAdmin ||
    (userProfile?.role === 'DEPARTMENT_ADMIN' &&
      userProfile?.assignedUniversity?.toLowerCase() === universityName.toLowerCase() &&
      userProfile?.assignedDepartment?.toLowerCase() === departmentName.toLowerCase());

  const handleProposeDeptChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await submitChangeRequest({
      requesterId: currentUser.uid,
      requesterName: userProfile?.name || 'Department Admin',
      requesterEmail: currentUser.email || '',
      requesterRole: userProfile?.role || 'DEPARTMENT_ADMIN',
      targetType: 'DEPARTMENT',
      targetId: 'dept-' + encodeURIComponent(departmentName.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      targetTitle: `${departmentName} (${universityName})`,
      university: universityName,
      department: departmentName,
      oldValue: JSON.stringify({ achievements: 'Academic and graduate benchmark' }),
      newValue: JSON.stringify({ achievements: editAchievements }),
      reason: 'Updated department achievements and research outcomes.',
    });

    setShowEditModal(false);
    alert('Change request submitted for Super Admin review!');
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() =>
            onNavigate('departmentUniversities', {
              dept: departmentName,
              group: 'Academic',
            })
          }
          className="text-sm text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
        >
          <span>← Back to offering universities</span>
        </button>

        {isThisDeptAdmin && (
          <button
            onClick={() => setShowEditModal(true)}
            className="pill text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
          >
            ✏ Submit Department Change
          </button>
        )}
      </div>

      {/* Hero Header */}
      <div className="card p-7 md:p-8 bg-navy text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-white/10 pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row gap-6 items-start z-10">
          <div className="w-20 h-20 rounded-2xl bg-white text-navy flex items-center justify-center text-2xl font-black shadow-lg">
            {universityInitials(universityName)}
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-blue-200 font-bold">
              DEPARTMENT PROFILE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 text-white">{departmentName}</h1>
            <p className="text-slate-300 mt-2 text-sm">{universityName}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="pill bg-white/10 border-white/15 text-white">Verified Curriculum</span>
              <span className="pill bg-white/10 border-white/15 text-white">Batch Cohort Tracker</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        <div className="metric">
          <b className="text-2xl navy">{alumni}</b>
          <p className="text-xs text-slate-400 mt-0.5">Alumni</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-emerald-600">{employment}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Employment</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{higher}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Higher studies</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{countries}</b>
          <p className="text-xs text-slate-400 mt-0.5">Countries</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{companies}+</b>
          <p className="text-xs text-slate-400 mt-0.5">Companies</p>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-6">
          <h2 className="text-xl font-black navy">Where alumni work</h2>
          <p className="text-xs text-slate-400 mt-1">Cross-industry distribution</p>
          <div className="h-72 mt-4 relative">
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black navy">Career destinations</h2>
          <p className="text-xs text-slate-400 mt-1">Sector and placement representation</p>
          <div className="mt-5 space-y-3.5">
            {Object.entries(careers).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 text-xs font-semibold">{k}</span>
                  <b className="navy text-xs">{v}%</b>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${v}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="card p-6 mt-6">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-black navy">Explore by batch</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a graduating cohort to view specific alumni trajectories and outcomes
            </p>
          </div>
          <span className="pill text-blue-600">6 batches</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          {['2020', '2021', '2022', '2023', '2024', '2025'].map((y) => {
            const batchSeed = demoSeed(universityName + '|' + departmentName + '|' + y);
            const batchAlumni = 85 + (batchSeed % 60);
            const batchEmployed = 75 + (batchSeed % 18);

            return (
              <button
                key={y}
                onClick={() =>
                  onNavigate('departmentBatch', {
                    dept: departmentName,
                    uni: universityName,
                    batch: y,
                  })
                }
                className="p-4 border border-soft rounded-xl hover:border-blue-300 text-left transition group bg-white"
              >
                <b className="block navy group-hover:text-blue-600 transition text-sm">
                  {y} Batch
                </b>
                <p className="text-xs text-slate-400 mt-1">{batchAlumni} alumni</p>
                <p className="text-xs text-emerald-600 mt-1 font-semibold">{batchEmployed}% employed</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Propose Department Information</h3>
            <p className="text-xs text-slate-500 mt-1">
              Department changes are reviewed by the Super Admin before appearing publicly.
            </p>

            <form onSubmit={handleProposeDeptChange} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Department Achievements & Research Highlights
                </label>
                <textarea
                  value={editAchievements}
                  onChange={(e) => setEditAchievements(e.target.value)}
                  rows={4}
                  className="account-input mt-1"
                  placeholder="e.g. Received national AI research recognition..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
