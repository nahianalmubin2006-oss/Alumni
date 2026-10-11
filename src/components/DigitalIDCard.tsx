import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getUniversityLogo, universityInitials } from '../data/initialData';
import {
  RotateCw,
  Printer,
  Copy,
  Check,
  Award,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  QrCode,
  Download,
} from 'lucide-react';

interface DigitalIDCardProps {
  userProfile: UserProfile;
  onNavigate?: (page: string, params?: Record<string, string>) => void;
  compact?: boolean;
}

export const DigitalIDCard: React.FC<DigitalIDCardProps> = ({
  userProfile,
  onNavigate,
  compact = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardTheme, setCardTheme] = useState<'sapphire' | 'emerald' | 'gold' | 'obsidian'>('sapphire');
  const [copiedPass, setCopiedPass] = useState(false);

  const universityLogo = userProfile.university ? getUniversityLogo(userProfile.university) : null;
  const isAlumni = userProfile.profileType === 'Alumni';

  const themeStyles = {
    sapphire: {
      cardBg: 'from-slate-950 via-blue-950 to-indigo-950',
      border: 'border-blue-500/40',
      glow: 'shadow-blue-900/30',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      accent: 'text-blue-400',
      chip: 'from-amber-200 via-amber-400 to-yellow-600',
      hologram: 'from-cyan-400/40 via-blue-500/20 to-purple-500/30',
    },
    emerald: {
      cardBg: 'from-slate-950 via-emerald-950 to-teal-950',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-900/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      accent: 'text-emerald-400',
      chip: 'from-amber-200 via-amber-400 to-yellow-600',
      hologram: 'from-emerald-400/40 via-teal-500/20 to-cyan-500/30',
    },
    gold: {
      cardBg: 'from-stone-950 via-amber-950/80 to-slate-950',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-900/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      accent: 'text-amber-400',
      chip: 'from-amber-100 via-amber-300 to-amber-600',
      hologram: 'from-amber-400/40 via-yellow-500/20 to-rose-500/30',
    },
    obsidian: {
      cardBg: 'from-zinc-950 via-neutral-900 to-slate-950',
      border: 'border-slate-700/60',
      glow: 'shadow-slate-900/40',
      badge: 'bg-white/10 text-slate-200 border-white/20',
      accent: 'text-slate-300',
      chip: 'from-slate-300 via-slate-400 to-zinc-600',
      hologram: 'from-violet-400/40 via-pink-500/20 to-cyan-500/30',
    },
  }[cardTheme];

  const handleCopyCard = () => {
    const cardData = `ALUMNISPHERE VERIFIED PASS
Name: ${userProfile.name}
Role: ${userProfile.profileType}
Institution: ${userProfile.university || 'N/A'}
Department: ${userProfile.department || 'N/A'}
Student/Roll ID: ${userProfile.studentId || 'N/A'}
Cohort: ${isAlumni ? `Class of ${userProfile.graduationYear || '2024'}` : `Standing: ${userProfile.studentYear || 'Active Student'}`}
Verification Hash: ${userProfile.id || 'N/A'}
Status: ACTIVE & VERIFIED`;
    navigator.clipboard.writeText(cardData);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Theme selection and quick toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pass Theme:</span>
          </span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {(['sapphire', 'emerald', 'gold', 'obsidian'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setCardTheme(theme)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition cursor-pointer text-[11px] ${
                  cardTheme === theme
                    ? 'bg-navy text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-bold transition shadow-xs cursor-pointer hover:bg-blue-50/50"
            title="Flip to view back or front of digital pass"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span>{isFlipped ? 'View Front Side' : 'Flip to Back Side'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-bold transition shadow-xs cursor-pointer hover:bg-emerald-50/50"
          >
            {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedPass ? 'Pass Copied!' : 'Copy Pass Data'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold transition shadow-xs cursor-pointer hover:bg-indigo-50/50"
            title="Print or export pass to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>

      {/* The Digital Card Container */}
      <div className="flex justify-center py-2">
        <div
          className={`relative w-full max-w-xl rounded-3xl bg-gradient-to-br ${themeStyles.cardBg} ${themeStyles.border} border-2 text-white p-6 sm:p-7 shadow-2xl ${themeStyles.glow} overflow-hidden transition-all duration-300`}
          style={{ minHeight: '340px' }}
        >
          {/* Ambient Holographic Orb */}
          <div
            className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${themeStyles.hologram} blur-3xl opacity-60 pointer-events-none`}
          />
          <div
            className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-3xl opacity-50 pointer-events-none"
          />

          {/* Micro-guilloche security grid background */}
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          {!isFlipped ? (
            /* ============================================================ */
            /* CARD FRONT                                                   */
            /* ============================================================ */
            <div className="relative z-10 flex flex-col justify-between h-full space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white/95 p-1 border border-white/30 flex items-center justify-center shrink-0 shadow-md">
                    {universityLogo ? (
                      <img src={universityLogo} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-black text-navy text-xs">
                        {universityInitials(userProfile.university || 'AS')}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase block">
                      BANGLADESH UNIVERSITY ALUMNI NETWORK
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                      {userProfile.university || 'Official University Campus'}
                    </h3>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${themeStyles.badge}`}>
                    {isAlumni ? '🎓 OFFICIAL ALUMNUS' : '📚 CAMPUS STUDENT'}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>UGC VERIFIED</span>
                  </span>
                </div>
              </div>

              {/* Middle Section: Photo + Smart Chip + Core Credentials */}
              <div className="grid sm:grid-cols-12 gap-4 items-center">
                {/* Photo & Chip Column */}
                <div className="sm:col-span-4 flex sm:flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 p-1 border-2 border-white/30 shadow-xl overflow-hidden flex items-center justify-center font-black text-2xl text-blue-200">
                      {userProfile.photoUrl ? (
                        <img src={userProfile.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        userProfile.name.charAt(0)
                      )}
                    </div>
                    {/* Hologram security seal */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-500 border border-white flex items-center justify-center shadow-md" title="AlumniSphere Holographic Seal">
                      <Award className="w-3.5 h-3.5 text-amber-950" />
                    </div>
                  </div>

                  {/* Smart Card Gold Chip Graphic */}
                  <div className={`w-11 h-8 rounded-md bg-gradient-to-br ${themeStyles.chip} border border-amber-300/60 shadow-inner flex flex-col justify-around p-1 shrink-0`}>
                    <div className="h-0.5 bg-amber-950/40 rounded-full" />
                    <div className="h-0.5 bg-amber-950/40 rounded-full w-2/3" />
                    <div className="h-0.5 bg-amber-950/40 rounded-full" />
                  </div>
                </div>

                {/* Identity Details Column */}
                <div className="sm:col-span-8 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Cardholder Full Name
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {userProfile.name}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Academic Department</span>
                      <p className="font-bold text-slate-200 text-[11px] truncate">
                        {userProfile.department || 'Not recorded'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Campus Roll / ID</span>
                      <p className="font-mono font-bold text-emerald-300 text-[11px]">
                        {userProfile.studentId || 'AS-' + (userProfile.id?.slice(0, 8) || '202401')}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Degree Standing</span>
                      <p className="font-bold text-slate-200 text-[11px]">
                        {userProfile.educationLevel || 'Undergraduate'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">
                        {isAlumni ? 'Graduation Cohort' : 'Current Standing'}
                      </span>
                      <p className="font-bold text-amber-300 text-[11px]">
                        {isAlumni ? `Class of ${userProfile.graduationYear || '2024'}` : (userProfile.studentYear || 'Active Student')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-slate-300" />
                  <span>REG-ID: {userProfile.id?.slice(0, 14) || 'AUTH-VERIFIED'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SECURE PASS</span>
                  </span>
                  <span>ISSUED: {new Date(userProfile.createdAt || Date.now()).getFullYear()}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CARD BACK                                                    */
            /* ============================================================ */
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              {/* Magnetic Stripe Graphic */}
              <div className="-mx-6 sm:-mx-7 -mt-6 sm:-mt-7 mb-2 h-11 bg-black/90 border-b border-white/10 flex items-center px-4">
                <div className="w-full h-2.5 bg-gradient-to-r from-amber-700/60 via-amber-400/40 to-amber-700/60 rounded-xs opacity-75" />
              </div>

              {/* Disclaimer / Accreditation */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                    OFFICIAL DISCLOSURE & HONOR CODE
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300">AUTHENTICATED CREDENTIAL</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-white/5 p-3 rounded-xl border border-white/10">
                  This electronic pass confirms that <b>{userProfile.name}</b> is an authenticated member of{' '}
                  <b>{userProfile.university || 'their higher education institution'}</b> recorded in the AlumniSphere
                  Digital Academic Registry. Verified under UGC institutional guidelines and backed by encrypted persistent storage.
                </p>
              </div>

              {/* Storage Cryptographic Specs */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/30 p-2.5 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-500 uppercase block">Storage Ledger</span>
                  <span className="text-slate-200">admin-database.json</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block">Encryption Salt</span>
                  <span className="text-slate-200">scrypt-pbkdf2-64b</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block">Issued For</span>
                  <span className="text-emerald-300 truncate block">{userProfile.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block">Verification Node</span>
                  <span className="text-blue-300">alumnisphere.gov.bd</span>
                </div>
              </div>

              {/* Barcode Strip Graphic */}
              <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-6 flex items-center gap-0.5">
                    {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 4].map((w, idx) => (
                      <div key={idx} className="bg-white h-full" style={{ width: `${w * 1.5}px` }} />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block tracking-widest">
                    *{userProfile.studentId || userProfile.id?.slice(0, 10).toUpperCase() || 'PASS-VALID'}*
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Front View</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
