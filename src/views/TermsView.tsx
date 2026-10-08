import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsViewProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigate, onBack }) => {
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

      <div className="card p-7 md:p-9 shadow-xl">
        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Legal</div>
        <h1 className="text-3xl sm:text-4xl font-black navy mt-2">Terms & Policy</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Platform integrity, privacy, and institutional verification standards for AlumniSphere.
        </p>

        <div className="mt-8 space-y-7">
          <div>
            <h2 className="text-xl font-black navy">1. User-submitted information</h2>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              Users are responsible for the authenticity and accuracy of information they submit. Do
              not upload another individual's private or contact details without explicit consent.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black navy">2. Alumni verification</h2>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              Only alumni accounts verified against institutional records, transcripts, or certificates
              receive the official Verified badge. Verified status requires administrative approval.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black navy">3. Privacy & Data Security</h2>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              Personal credentials and contact points are protected by Firebase Authentication and
              strict Cloud Firestore Attribute-Based Access Control rules. Passwords are never stored
              in plain text or accessible to client queries.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black navy">4. Sample vs Real Database Data</h2>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              While UGC directory lists are authentic, prototype institutions with no registered
              alumni show baseline estimates clearly separated from verified database records.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black navy">5. Platform Code of Conduct</h2>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              The platform must not be used for impersonation, harassment, unauthorized scraping, or
              defamatory content. Accounts violating platform integrity are subject to immediate
              suspension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
