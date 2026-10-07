import React from 'react';

interface CreatorViewProps {
  onNavigate: (page: string) => void;
}

export const CreatorView: React.FC<CreatorViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <button
        onClick={() => onNavigate('home')}
        className="text-sm text-slate-500 hover:text-slate-800 transition mb-6 flex items-center gap-1"
      >
        <span>← Home</span>
      </button>

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
              Nahian Al Mubin, a BUP CSE student, made this platform to connect university students
              and graduates through a structured, transparent alumni intelligence network where
              people can discover educational trajectories, cohorts, career destinations, and
              professional journeys across Bangladesh and the global diaspora.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h2 className="font-black navy text-lg">Built For</h2>
            <p className="text-sm text-slate-600 mt-2 leading-7">
              Students seeking alumni guidance, graduates reconnecting with class cohorts,
              universities establishing authenticated career graphs, and future employers exploring
              verified university talent.
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
