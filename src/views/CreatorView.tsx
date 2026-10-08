import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CreatorViewProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

export const CreatorView: React.FC<CreatorViewProps> = ({ onNavigate, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('home'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Home</span>
        </button>
      </div>

      <div className="card p-8 md:p-10 shadow-xl">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-3xl bg-navy text-white flex items-center justify-center text-3xl font-black shadow-lg">
            A
          </div>
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Creator</div>
            <h1 className="text-3xl sm:text-4xl font-black navy mt-2">AlumniSphere</h1>
            <p className="text-slate-500 mt-1">University Alumni Intelligence Platform</p>
          </div>
        </div>

        <div className="line my-8"></div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-slate-50 rounded-2xl p-6">
            <h2 className="font-black navy text-lg">Creator Vision</h2>
            <p className="text-sm text-slate-600 mt-2 leading-7">
              Nahian Al Mubin created AlumniSphere as an open, university-neutral alumni intelligence
              network for all students, alumni, and faculty across higher education institutions in Bangladesh.
              The platform is built to provide an equal, transparent space where every student can discover
              educational trajectories, class cohorts, career destinations, and verified professional
              journeys across Bangladesh and the worldwide diaspora.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h2 className="font-black navy text-lg">Built For All Students</h2>
            <p className="text-sm text-slate-600 mt-2 leading-7">
              Undergraduates and postgraduates from any university seeking mentorship, verified alumni
              reconnecting with class cohorts, institutions establishing authenticated career graphs,
              and future employers exploring talent across public, engineering, and private universities nationwide.
            </p>
          </div>
        </div>

        <div className="mt-6 p-6 border border-soft rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black navy text-base">Creator Contact</h3>
            <p className="text-sm text-slate-500 mt-1">
              Email:{' '}
              <a
                href="mailto:nahianalmubin2006@gmail.com"
                className="font-bold text-blue-600 hover:underline"
              >
                nahianalmubin2006@gmail.com
              </a>
            </p>
          </div>

          <a
            href="mailto:nahianalmubin2006@gmail.com"
            className="bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition text-center shadow"
          >
            Send Inquiry
          </a>
        </div>
      </div>
    </div>
  );
};
