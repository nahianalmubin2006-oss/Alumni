import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useAdmin } from '../../context/AdminContext';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, KeyRound, Building2, Users } from 'lucide-react';
import { auth } from '../../firebase';

interface AdminLoginViewProps {
  onNavigatePublic: () => void;
  onLoginSuccess: () => void;
  onBack?: () => void;
}

interface RequestUniversityOption {
  id: string;
  name: string;
  type?: string;
}

interface RequestDepartmentOption {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  group?: string;
}

interface InstitutionAdminRequest {
  id: string;
  type?: string;
  requestedRole?: string;
  university?: string;
  department?: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onNavigatePublic,
  onLoginSuccess,
}) => {
  const { loginAdmin, logoutAdmin, sendAdminPasswordReset } = useAdmin();
  const getInitialPortalMode = (): 'choice' | 'central-login' | 'co-admin-signup' | 'institution-request' => {
    if (typeof window === 'undefined') return 'choice';
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      search.includes('mode=institution-request') ||
      search.includes('mode=request') ||
      search.includes('tab=request') ||
      search.includes('role=university_admin') ||
      search.includes('role=department_admin') ||
      hash === '#request'
    ) {
      return 'institution-request';
    }
    return 'choice';
  };

  const getInitialInstitutionRole = (): 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN' => {
    if (typeof window === 'undefined') return 'UNIVERSITY_ADMIN';
    const search = window.location.search.toLowerCase();
    if (search.includes('role=department_admin') || search.includes('role=department')) {
      return 'DEPARTMENT_ADMIN';
    }
    return 'UNIVERSITY_ADMIN';
  };

  const [portalMode, setPortalMode] = useState<'choice' | 'central-login' | 'co-admin-signup' | 'institution-request'>(getInitialPortalMode);
  const [selectedLoginRole, setSelectedLoginRole] = useState<'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN'>('SUPER_ADMIN');
  const roleLabels = { SUPER_ADMIN: 'Super Admin', CO_ADMIN: 'Co-admin', UNIVERSITY_ADMIN: 'University Admin', DEPARTMENT_ADMIN: 'Department Admin' };
  const [applicantName, setApplicantName] = useState('');
  const [institutionRole, setInstitutionRole] = useState<'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN'>(getInitialInstitutionRole);
  const [institutionUniversity, setInstitutionUniversity] = useState('');
  const [institutionDepartment, setInstitutionDepartment] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [requestUniversities, setRequestUniversities] = useState<RequestUniversityOption[]>([]);
  const [requestDepartments, setRequestDepartments] = useState<RequestDepartmentOption[]>([]);
  const [requestCatalogLoading, setRequestCatalogLoading] = useState(false);
  const [requestCatalogError, setRequestCatalogError] = useState('');
  const [myRequests, setMyRequests] = useState<InstitutionAdminRequest[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadRequestOptions = async () => {
      setRequestCatalogLoading(true);
      try {
        const response = await fetch('/api/admin/request-options');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load universities and departments.');
        if (mounted) {
          setRequestUniversities(Array.isArray(data.universities) ? data.universities : []);
          setRequestDepartments(Array.isArray(data.departments) ? data.departments : []);
          setRequestCatalogError('');
        }
      } catch (error: any) {
        if (mounted) setRequestCatalogError(error.message || 'Unable to load university and department options.');
      } finally {
        if (mounted) setRequestCatalogLoading(false);
      }
    };

    const loadMyRequests = async (user: NonNullable<typeof auth.currentUser>) => {
      setMyRequestsLoading(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/applications/my-requests', {
          headers: { Authorization: 'Bearer ' + idToken },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load your request history.');
        if (mounted) setMyRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch {
        if (mounted) setMyRequests([]);
      } finally {
        if (mounted) setMyRequestsLoading(false);
      }
    };

    void loadRequestOptions();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) void loadMyRequests(user);
      else if (mounted) setMyRequests([]);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const filteredRequestUniversities = requestUniversities.filter((university) => university.name.toLocaleLowerCase().includes(universitySearch.trim().toLocaleLowerCase()));
  const selectedUniversity = requestUniversities.find((university) => university.id === institutionUniversity);
  const availableDepartments = requestDepartments.filter((department) =>
    department.universityId === institutionUniversity ||
    (selectedUniversity && department.universityName?.toLocaleLowerCase() === selectedUniversity.name.toLocaleLowerCase())
  );
  const filteredAvailableDepartments = availableDepartments.filter((department) => department.name.toLocaleLowerCase().includes(departmentSearch.trim().toLocaleLowerCase()));
  const selectedDepartment = availableDepartments.find((department) => department.id === institutionDepartment);

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
    if (!institutionUniversity || !selectedUniversity) {
      setErrorMessage('Please select a university from the available list.');
      return;
    }
    if (institutionRole === 'DEPARTMENT_ADMIN' && (!institutionDepartment || !selectedDepartment)) {
      setErrorMessage('Please select a department belonging to the selected university.');
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
          universityId: selectedUniversity.id,
          university: selectedUniversity.name,
          departmentId: institutionRole === 'DEPARTMENT_ADMIN' ? selectedDepartment?.id : undefined,
          department: institutionRole === 'DEPARTMENT_ADMIN' ? selectedDepartment?.name : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the request.');
      setSuccessMessage(data.message || 'Institution admin request submitted for review.');
      if (data.application) {
        setMyRequests((previous) => [data.application, ...previous.filter((item) => item.id !== data.application.id)]);
      }
      setInstitutionDepartment('');
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
          <button onClick={() => setPortalMode('institution-request')} className="mt-4 w-full rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-left hover:border-emerald-400 hover:bg-emerald-950/60 transition flex items-center gap-3.5 shadow-lg cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <strong className="block text-sm text-emerald-200 font-bold">Apply for University Admin or Department Admin Access</strong>
              <span className="text-xs text-slate-300">Search and select your university / department to submit your access request.</span>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-200 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              Apply Now →
            </span>
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
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => setPortalMode('choice')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to portal options</span>
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Access Application
            </span>
          </div>

          <h1 className="text-2xl font-black text-white">Institution Admin Request</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Apply to become an authorized <strong>University Admin</strong> or <strong>Department Admin</strong>. Use your existing verified Alumni account.
          </p>

          {auth.currentUser ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Signed in as <strong>{auth.currentUser.email}</strong></span>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong>Authentication required:</strong> Sign in to your normal Alumni account on the main website first, then return here to submit an admin access request.
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Already approved?</span>
            <button
              type="button"
              onClick={() => {
                setSelectedLoginRole(institutionRole);
                setPortalMode('central-login');
                setMode('login');
              }}
              className="font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Sign in to admin dashboard →
            </button>
          </div>

          <form onSubmit={handleInstitutionApplication} className="mt-5 space-y-5">
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Select Administrative Role Tier *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInstitutionRole('UNIVERSITY_ADMIN');
                    setInstitutionDepartment('');
                    setDepartmentSearch('');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    institutionRole === 'UNIVERSITY_ADMIN'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>University Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInstitutionRole('DEPARTMENT_ADMIN');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    institutionRole === 'DEPARTMENT_ADMIN'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Department Admin</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {institutionRole === 'UNIVERSITY_ADMIN'
                  ? 'University Admin manages verified alumni, campus announcements, and members across the entire institution.'
                  : 'Department Admin manages verified students, faculty news, and batch records scoped to a single department.'}
              </p>
            </div>

            {/* University Selection with Visible Search Input Directly Above Dropdown */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  2. Select University *
                </label>
                {requestUniversities.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {filteredRequestUniversities.length} / {requestUniversities.length} universities
                  </span>
                )}
              </div>

              {/* UNIVERSITY SEARCH INPUT (DIRECTLY ABOVE DROPDOWN) */}
              <div className="relative mb-2.5">
                <input
                  type="text"
                  value={universitySearch}
                  onChange={(e) => setUniversitySearch(e.target.value)}
                  placeholder="🔍 Search universities by name..."
                  aria-label="Search universities"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                />
                {universitySearch && (
                  <button
                    type="button"
                    onClick={() => setUniversitySearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Clear Message when no universities match */}
              {universitySearch.trim() && filteredRequestUniversities.length === 0 && (
                <div className="mb-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>No universities match "<strong>{universitySearch}</strong>". Check spelling or clear search.</span>
                </div>
              )}

              {/* University Select Dropdown */}
              <select
                value={institutionUniversity}
                onChange={(e) => {
                  setInstitutionUniversity(e.target.value);
                  setInstitutionDepartment('');
                  setDepartmentSearch('');
                  setErrorMessage('');
                }}
                required
                disabled={requestCatalogLoading || requestUniversities.length === 0}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">
                  {requestCatalogLoading
                    ? 'Loading universities…'
                    : filteredRequestUniversities.length
                    ? 'Choose a university from the list'
                    : 'No universities match your search'}
                </option>
                {filteredRequestUniversities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name} {uni.type ? `(${uni.type})` : ''}
                  </option>
                ))}
              </select>

              {selectedUniversity && (
                <p className="mt-2 text-xs text-blue-400 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Selected: <strong>{selectedUniversity.name}</strong></span>
                </p>
              )}
            </div>

            {/* Department Selection with Visible Search Input (Only for Department Admin) */}
            {institutionRole === 'DEPARTMENT_ADMIN' && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    3. Select Department *
                  </label>
                  {institutionUniversity && availableDepartments.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {filteredAvailableDepartments.length} / {availableDepartments.length} departments
                    </span>
                  )}
                </div>

                {!institutionUniversity ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-400 flex items-center gap-2">
                    <span className="text-base">👆</span>
                    <span>Please select a university above first to search and select from its departments.</span>
                  </div>
                ) : (
                  <>
                    {/* DEPARTMENT SEARCH INPUT (DIRECTLY ABOVE DROPDOWN) */}
                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        placeholder="🔍 Search departments by name..."
                        aria-label="Search departments"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                      />
                      {departmentSearch && (
                        <button
                          type="button"
                          onClick={() => setDepartmentSearch('')}
                          className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white p-0.5 cursor-pointer"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Clear Message when no departments match */}
                    {departmentSearch.trim() && filteredAvailableDepartments.length === 0 && (
                      <div className="mb-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>No departments in this university match "<strong>{departmentSearch}</strong>".</span>
                      </div>
                    )}

                    {/* Department Select Dropdown */}
                    <select
                      value={institutionDepartment}
                      onChange={(e) => {
                        setInstitutionDepartment(e.target.value);
                        setErrorMessage('');
                      }}
                      required
                      disabled={availableDepartments.length === 0}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    >
                      <option value="">
                        {requestCatalogLoading
                          ? 'Loading departments…'
                          : filteredAvailableDepartments.length
                          ? 'Choose a department from the list'
                          : availableDepartments.length
                          ? 'No departments match your search'
                          : 'No departments available for this university'}
                      </option>
                      {filteredAvailableDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.group ? `[${dept.group}]` : ''}
                        </option>
                      ))}
                    </select>

                    {availableDepartments.length === 0 && (
                      <p className="mt-2 text-xs text-amber-200">
                        No departments are currently listed for this university in the database catalog. Please contact an administrator to register departments.
                      </p>
                    )}

                    {selectedDepartment && (
                      <p className="mt-2 text-xs text-blue-400 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>Selected: <strong>{selectedDepartment.name}</strong></span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {requestCatalogError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{requestCatalogError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !auth.currentUser ||
                requestCatalogLoading ||
                !selectedUniversity ||
                (institutionRole === 'DEPARTMENT_ADMIN' && !selectedDepartment)
              }
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 text-sm font-bold text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting request…</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Submit {institutionRole === 'UNIVERSITY_ADMIN' ? 'University Admin' : 'Department Admin'} Access Request</span>
                </>
              )}
            </button>
          </form>

          {/* Previous Request History */}
          <div className="mt-8 border-t border-slate-800 pt-5">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Your admin access requests</span>
              {myRequests.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {myRequests.length}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Applications are reviewed by authorized platform administrators before access is granted.
            </p>
            {myRequestsLoading && <p className="mt-3 text-xs text-slate-400 animate-pulse">Loading request history…</p>}
            {!myRequestsLoading && myRequests.length === 0 && (
              <p className="mt-3 text-xs text-slate-500">No previous requests found for this signed-in account.</p>
            )}
            <div className="mt-3 space-y-2.5">
              {myRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200">
                        {request.type || request.requestedRole || 'Admin'} · {request.university || 'University not specified'}
                        {request.department ? ' / ' + request.department : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Submitted {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'date unavailable'}
                      </p>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ' +
                        (request.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : request.status === 'REJECTED'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30')
                      }
                    >
                      {request.status}
                    </span>
                  </div>
                  {request.reviewerNote && (
                    <p className="mt-2 text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <strong>Reviewer note:</strong> {request.reviewerNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
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

          {/* Quick toggle to Access Request for University Admin or Department Admin */}
          {(selectedLoginRole === 'UNIVERSITY_ADMIN' || selectedLoginRole === 'DEPARTMENT_ADMIN') && (
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-white block">Not yet approved as {roleLabels[selectedLoginRole]}?</span>
                <span className="text-[11px] text-slate-400">Search and select your university/department to apply.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInstitutionRole(selectedLoginRole);
                  setPortalMode('institution-request');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                Request Access →
              </button>
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
