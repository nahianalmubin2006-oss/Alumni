import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginViewProps {
  onNavigatePublic: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onNavigatePublic,
  onLoginSuccess,
}) => {
  const { loginAdmin, sendAdminPasswordReset } = useAdmin();
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
      await loginAdmin(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {/* Top return link */}
        <button
          onClick={onNavigatePublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition mb-6 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return to Public Website</span>
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
              {mode === 'login' ? 'Admin Portal' : 'Admin Password Recovery'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {mode === 'login'
                ? 'Restricted management console. All access requests are cryptographically verified and recorded to the security audit trail.'
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
