import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { demoSeed } from '../data/initialData';
import { useData } from '../context/DataContext';

interface DepartmentBatchViewProps {
  departmentName: string;
  universityName: string;
  batchYear: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DepartmentBatchView: React.FC<DepartmentBatchViewProps> = ({
  departmentName,
  universityName,
  batchYear,
  onNavigate,
}) => {
  const { alumni } = useData();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const seed = demoSeed(universityName + '|' + departmentName + '|' + batchYear);
  const studentsCount = 110 + (seed % 45);
  const employedRate = 78 + (seed % 17);
  const higherStudyRate = 8 + ((seed >> 4) % 9);
  const internationalRate = 6 + ((seed >> 8) % 10);
  const entrepreneursRate = 4 + ((seed >> 12) % 6);

  const careers: Record<string, number> = {
    'Technology & Software': 38 + (seed % 12),
    'Government & Public Sector': 14 + ((seed >> 3) % 8),
    'Finance & Banking': 12 + ((seed >> 6) % 8),
    'Research & Higher Ed': 10 + ((seed >> 9) % 7),
    'Industry & Other': 12 + ((seed >> 12) % 6),
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: Object.keys(careers),
        datasets: [
          {
            data: Object.values(careers),
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
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
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [departmentName, batchYear]);

  // Find real alumni from this batch
  const batchAlumni = alumni.filter(
    (a) =>
      a.university.toLowerCase() === universityName.toLowerCase() &&
      a.department.toLowerCase() === departmentName.toLowerCase() &&
      a.batch === batchYear &&
      a.status === 'APPROVED'
  );

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <button
        onClick={() =>
          onNavigate('departmentProfile', {
            dept: departmentName,
            uni: universityName,
          })
        }
        className="text-sm text-slate-500 hover:text-slate-800 transition mb-6 flex items-center gap-1"
      >
        <span>← Back to {departmentName}</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Batch Explorer
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">
            {departmentName} — {batchYear} Batch
          </h1>
          <p className="text-slate-500 mt-2">
            {universityName} · Graduating Cohort Intelligence
          </p>
        </div>
        <span className="pill text-emerald-600 bg-emerald-50/70 border-emerald-200 self-start md:self-end">
          ✓ Verified Cohort
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-7">
        <div className="metric">
          <b className="text-2xl navy">{studentsCount}</b>
          <p className="text-xs text-slate-400 mt-0.5">Students</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-emerald-600">{employedRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Employed</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{higherStudyRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Higher study</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{internationalRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">International</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{entrepreneursRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Entrepreneurs</p>
        </div>
      </div>

      {/* Chart and Alumni Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-6">
          <h2 className="text-xl font-black navy">Where this batch works</h2>
          <p className="text-xs text-slate-400 mt-1">Employment sector allocation</p>
          <div className="h-72 mt-4 relative">
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black navy">Alumni from this batch</h2>
            <span className="pill text-[11px] text-blue-600">
              {batchAlumni.length} profiles
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verified members from the {batchYear} graduating class
          </p>

          <div className="mt-4 grid gap-3 max-h-[380px] overflow-y-auto pr-1">
            {batchAlumni.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-soft rounded-2xl">
                No alumni registered for the {batchYear} cohort yet.
              </div>
            ) : (
              batchAlumni.map((person) => {
                const initials = person.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <button
                    key={person.id}
                    onClick={() =>
                      onNavigate('alumniProfile', {
                        id: person.id,
                        name: person.name,
                      })
                    }
                    className="card p-4 text-left flex items-center justify-between hover:border-blue-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full avatar flex items-center justify-center font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <b className="navy text-sm block group-hover:text-blue-600 transition">
                          {person.name}
                        </b>
                        <p className="text-xs text-slate-500">{person.jobRole}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {departmentName.split(' ')[0]} {batchYear} · {person.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full block">
                        ✓ Verified
                      </span>
                      <span className="text-xs text-blue-600 font-semibold mt-1 inline-block">
                        Profile →
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
