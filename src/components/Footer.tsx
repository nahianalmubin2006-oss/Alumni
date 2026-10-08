import React from 'react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-soft mt-16 bg-white/40">
      <div className="max-w-7xl mx-auto px-5 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-navy text-white text-[10px] font-black flex items-center justify-center">
              A
            </span>
            <span className="font-bold navy">AlumniSphere</span>
          </div>
          <span>© 2026 AlumniSphere · UGC University Directory</span>
          <button
            onClick={() => onNavigate('terms')}
            className="hover:text-blue-600 transition"
          >
            Terms & Policy
          </button>
          <button
            onClick={() => onNavigate('creator')}
            className="hover:text-blue-600 transition"
          >
            Creator Vision
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onNavigate('admin-login')}
            className="text-slate-500 hover:text-blue-600 transition font-medium flex items-center gap-1.5"
            title="Administrative Access Gateway"
          >
            <span>🔒</span>
            <span>Admin</span>
          </button>
        </div>
        <div className="text-slate-400 text-center md:text-right">
          <span>Connected to Cloud Firestore & Firebase Auth</span>
        </div>
      </div>
    </footer>
  );
};
