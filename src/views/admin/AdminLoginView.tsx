import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, KeyRound, Building2, Users } from 'lucide-react';
import { auth } from '../../firebase';

interface AdminLoginViewProps {
  onNavigatePublic: () => void;
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onNavigatePublic,
  onLoginSuccess,
}) => {
  const { loginAdmin, logoutAdmin, sendAdminPasswordReset } = useAdmin();
  const [portalMode, setPortalMode] = useState<'choice' | 'central-login' | 'co-admin-signup' | 'institution-request'>('choice');
  const [selectedLoginRole, setSelectedLoginRole] = useState<'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN'>('SUPER_ADMIN');
  const roleLabels = { SUPER_ADMIN: 'Super Admin', CO_ADMIN: 'Co-admin', UNIVERSITY_ADMIN: 'University Admin', DEPARTMENT_ADMIN: 'Department Admin' };
  const [applicantName, setApplicantName] = useState('');
  const [institutionRole, setInstitutionRole] = useState<'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN'>('UNIVERSITY_ADMIN');
  const [institutionUniversity, setInstitutionUniversity] = useState('');
  const [institutionDepartment, setInstitutionDepartment] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMessage('Please enter your administrator Gmail address.');
        return;
      }
      setLoading(true);
      try {
        await sendAdminPasswordReset(email.trim());
        setSuccessMessage(
          `Password reset link successfully sent to ${email.trim()}! Please check your Gmail inbox or spam folder, reset your password, and return here to log in.`
        );
      } catch (err: any) {
        if (err?.code === 'auth/user-not-found') {
          setErrorMessage('No administrator account found with that email address.');
        } else if (err?.code === 'auth/invalid-email') {
          setErrorMessage('Please enter a valid email address.');
        } else {
          setErrorMessage(err.message || 'Failed to send password reset email. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your administrator email and password.');
      return;
    }

    setLoading(true);

    try {
      const authenticatedUser = await loginAdmin(email.trim(), password, selectedLoginRole);
      if (authenticatedUser.role !== selectedLoginRole) {
        await logoutAdmin();
        throw new Error(`This account is assigned to ${roleLabels[authenticatedUser.role as keyof typeof roleLabels] || authenticatedUser.role}, not ${roleLabels[selectedLoginRole]}. Choose the matching admin login option.`);
      }
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoAdminApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/applications/co-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: applicantName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the application.');
      setSuccessMessage(data.message || 'Application submitted for Super Admin review.');
      setPassword('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to submit the application.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!auth.currentUser) {
      setErrorMessage('Please sign in to your existing Alumni account on the public website, then return here to request admin access.');
      return;
    }
    setLoading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/admin/applications/institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          requestedRole: institutionRole,
          university: institutionUniversity,
          department: institutionRole === 'DEPARTMENT_ADMIN' ? institutionDepartment : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the request.');
      setSuccessMessage(data.message || 'Institution admin request submitted for review.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to submit the request.');
    } finally {
      setLoading(false);
    }
  };

  if (portalMode === 'choice') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <button onClick={onNavigatePublic} className="mb-6 text-xs text-slate-400 hover:text-white">← Back to public website</button>
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4"><Shield className="w-7 h-7" /></div>
            <h1 className="text-3xl font-black">AlumniSphere Admin Portal</h1>
            <p className="text-sm text-slate-400 mt-2">Choose the administration path for your approved role.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {([
              { role: 'SUPER_ADMIN', title: 'Super Admin Login', detail: 'Full platform governance for trusted Super Admin accounts.', color: 'blue' },
              { role: 'CO_ADMIN', title: 'Co-admin Login', detail: 'Central management access for accounts already approved by a Super Admin.', color: 'amber' },
              { role: 'UNIVERSITY_ADMIN', title: 'University Admin Login', detail: 'Manage only your assigned university after approval.', color: 'emerald' },
              { role: 'DEPARTMENT_ADMIN', title: 'Department Admin Login', detail: 'Manage only your assigned university department after approval.', color: 'violet' },
            ] as const).map((item) => (
              <button key={item.role} onClick={() => { setSelectedLoginRole(item.role); setPortalMode('central-login'); setMode('login'); setErrorMessage(''); setSuccessMessage(''); }} className="text-left rounded-3xl border border-slate-700 bg-slate-900 p-6 hover:border-blue-400 transition">
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center mb-4">{item.role === 'UNIVERSITY_ADMIN' || item.role === 'DEPARTMENT_ADMIN' ? <Building2 className="w-5 h-5" /> : item.role === 'CO_ADMIN' ? <Users className="w-5 h-5" /> : <Shield className="w-5 h-5" />}</div>
                <h2 className="text-lg font-extrabold">{item.title}</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.detail}</p>
                <span className="inline-block mt-5 text-xs font-bold text-blue-300">Continue →</span>
              </button>
            ))}
          </div>
          <button onClick={() => setPortalMode('institution-request')} className="mt-4 w-full rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-4 text-left hover:border-emerald-400 transition flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-300" />
            <span><strong className="block text-sm">Request University / Department Admin access</strong><span className="text-xs text-slate-400">New requests stay pending until an authorized administrator approves them.</span></span>
          </button>
          <button onClick={() => setPortalMode('co-admin-signup')} className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left hover:border-blue-400 transition flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-300" />
            <span><strong className="block text-sm">Apply to become a Co-admin</strong><span className="text-xs text-slate-400">Application only — access remains disabled until a Super Admin approves it.</span></span>
          </button>
        </div>
      </div>
    );
  }

  if (portalMode === 'co-admin-signup') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <button onClick={() => setPortalMode('choice')} className="text-xs text-slate-400 hover:text-white mb-5">← Back to portal options</button>
          <h1 className="text-2xl font-black">Co-admin application</h1>
          <p className="text-xs text-slate-400 mt-2">Your credentials are stored as a pending application. You cannot log in until the Super Admin approves it.</p>
          {successMessage && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{successMessage}</div>}
          {errorMessage && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{errorMessage}</div>}
          <form onSubmit={handleCoAdminApplication} className="mt-5 space-y-4">
            <div><label className="block text-xs font-bold mb-1.5">Full name</label><input value={applicantName} onChange={e => setApplicantName(e.target.value)} required minLength={2} autoComplete="name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></div>
            <div><label className="block text-xs font-bold mb-1.5">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></div>
            <div><label className="block text-xs font-bold mb-1.5">Password (minimum 10 characters)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></div>
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-bold">{loading ? 'Submitting…' : 'Submit for Super Admin approval'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (portalMode === 'institution-request') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <button onClick={() => setPortalMode('choice')} className="text-xs text-slate-400 hover:text-white mb-5">← Back to portal options</button>
          <h1 className="text-2xl font-black">Institution admin request</h1>
          <p className="text-xs text-slate-400 mt-2">Use your existing Alumni account. Your signed-in identity is verified by the server; your profile is not replaced.</p>
          {auth.currentUser ? <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">Signed in as {auth.currentUser.email}</div> : <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Sign in to your normal Alumni account first, then return here.</div>}
          {successMessage && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{successMessage}</div>}
          {errorMessage && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{errorMessage}</div>}
          <button type="button" onClick={() => { setSelectedLoginRole(institutionRole); setPortalMode('central-login'); setMode('login'); }} className="mt-4 text-xs font-bold text-blue-300 hover:text-blue-200">
            Already approved? Sign in with your existing Alumni account →
          </button>
          <form onSubmit={handleInstitutionApplication} className="mt-5 space-y-4">
            <div><label className="block text-xs font-bold mb-1.5">Requested role</label><select value={institutionRole} onChange={e => setInstitutionRole(e.target.value as 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN')} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm"><option value="UNIVERSITY_ADMIN">University Admin</option><option value="DEPARTMENT_ADMIN">Department Admin</option></select></div>
            <div><label className="block text-xs font-bold mb-1.5">University (exact name)</label><input value={institutionUniversity} onChange={e => setInstitutionUniversity(e.target.value)} required placeholder="e.g. University of Dhaka" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></div>
            {institutionRole === 'DEPARTMENT_ADMIN' && <div><label className="block text-xs font-bold mb-1.5">Department (exact name)</label><input value={institutionDepartment} onChange={e => setInstitutionDepartment(e.target.value)} required placeholder="e.g. Computer Science & Engineering" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></div>}
            <button disabled={loading || !auth.currentUser} className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-bold">{loading ? 'Submitting…' : 'Submit access request'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {/* Top return link */}
        <button
          onClick={() => setPortalMode('choice')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition mb-6 group cursor-pointer shadow-sm"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
          <span>← Back to admin role options</span>
        </button>

        {/* Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 sm:p-9 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
              Security Access Control
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              {mode === 'login' ? `${roleLabels[selectedLoginRole]} Login` : `${roleLabels[selectedLoginRole]} Password Recovery`}
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {mode === 'login'
                ? `Sign in with the account approved for the ${roleLabels[selectedLoginRole]} role. The server verifies your actual role and scope before granting access.`
                : 'Enter your registered administrator email address to receive an official password recovery link.'}
            </p>
          </div>

          {/* Success notice */}
          {successMessage && (
            <div className="mt-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="mt-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nahianalmubin2006@gmail.com"
                  required
                  autoComplete="email"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Verifying clearance...' : 'Sending reset link...'}</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{mode === 'login' ? 'Authenticate & Enter' : 'Send Password Reset Email'}</span>
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
                >
                  ← Back to Admin Login
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Security watermark */}
        <div className="text-center mt-6 text-[11px] text-slate-500">
          AlumniSphere Unified Higher Education Intelligence · Protected by Server RBAC
        </div>
      </div>
    </div>
  );
};
