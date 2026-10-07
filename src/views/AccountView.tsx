import React, { useState } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG } from '../data/initialData';
import { ProfileType } from '../types';

interface AccountViewProps {
  onNavigate: (page: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    userProfile,
    loginWithEmail,
    registerUser,
    loginWithGoogle,
    logout,
    updateProfileData,
  } = useAuth();

  const { submitVerificationRequest } = useData();

  // Mode: 'signedOut', 'login', 'signupChoice', 'signupStudent', 'signupAlumni', 'edit'
  const [viewState, setViewState] = useState<'default' | 'login' | 'choice' | 'form' | 'edit'>('default');
  const [profileType, setProfileType] = useState<ProfileType>('Student');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [educationLevel, setEducationLevel] = useState('Undergraduate');
  const [studentYear, setStudentYear] = useState('');
  const [expectedGraduation, setExpectedGraduation] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [city, setCity] = useState('Dhaka');
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Verification request modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up was blocked by your browser. Please allow popups or use email/password.');
      } else if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setErrorMsg('Google Sign-In was not completed. Please log in with email/password.');
      }
    }
  };

  // Pre-fill for edit mode
  const enterEditMode = () => {
    if (!userProfile) return;
    setName(userProfile.name || '');
    const currentUni = userProfile.university || '';
    const currentDept = userProfile.department || '';

    const hasUniInList = ALL_DIRECTORY_UNIVERSITIES.some((u) => u.name === currentUni);
    const hasDeptInList = RAW_DEPARTMENT_CATALOG.some((d) => d.name === currentDept);

    if (currentUni && !hasUniInList) {
      setUniversity('OTHER');
      setCustomUniversity(currentUni);
    } else {
      setUniversity(currentUni);
      setCustomUniversity('');
    }

    if (currentDept && !hasDeptInList) {
      setDepartment('OTHER');
      setCustomDepartment(currentDept);
    } else {
      setDepartment(currentDept);
      setCustomDepartment('');
    }

    setStudentId(userProfile.studentId || '');
    setEducationLevel(userProfile.educationLevel || 'Undergraduate');
    setStudentYear(userProfile.studentYear || '');
    setExpectedGraduation(userProfile.expectedGraduation || '');
    setGraduationYear(userProfile.graduationYear || '');
    setJobRole(userProfile.jobRole || '');
    setCompany(userProfile.company || '');
    setCountry(userProfile.country || 'Bangladesh');
    setCity(userProfile.city || 'Dhaka');
    setBio(userProfile.bio || '');
    setLinkedin(userProfile.linkedin || '');
    setViewState('edit');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithEmail(email.trim(), password);
      setViewState('default');
    } catch (err: any) {
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setErrorMsg('Incorrect email or password. Please verify your credentials or create an account.');
      } else {
        setErrorMsg(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim();
    const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim();

    if (!finalUniversity) {
      setErrorMsg('Please select or specify your University.');
      setLoading(false);
      return;
    }
    if (!finalDepartment) {
      setErrorMsg('Please select or specify your Department.');
      setLoading(false);
      return;
    }

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        profileType,
        university: finalUniversity,
        department: finalDepartment,
        studentId: studentId.trim(),
        educationLevel,
        studentYear: studentYear.trim(),
        expectedGraduation: expectedGraduation.trim(),
        graduationYear: graduationYear.trim(),
        jobRole: jobRole.trim(),
        company: company.trim(),
        country: country.trim(),
        city: city.trim(),
        bio: bio.trim(),
        linkedin: linkedin.trim(),
      });
      setSuccessMsg('Account created successfully! Your profile is pending institutional verification.');
      setViewState('default');
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setErrorMsg('This email is already registered. Please log in with your password.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMsg('Password must be at least 6 characters.');
      } else {
        setErrorMsg(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim();
    const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim();

    try {
      await updateProfileData({
        name,
        university: finalUniversity,
        department: finalDepartment,
        studentId,
        educationLevel,
        studentYear,
        expectedGraduation,
        graduationYear,
        jobRole,
        company,
        country,
        city,
        bio,
        linkedin,
      });
      setSuccessMsg('Profile updated successfully!');
      setViewState('default');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    try {
      await submitVerificationRequest({
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: currentUser.email || '',
        university: userProfile.university || '',
        department: userProfile.department || '',
        batch: userProfile.graduationYear || '2023',
        studentId: userProfile.studentId || '',
        proofUrl,
        notes: verificationNotes,
      });
      setVerificationModalOpen(false);
      setSuccessMsg('Verification request submitted to Super Admin! Check notifications for updates.');
    } catch (err: any) {
      setErrorMsg('Failed to submit verification request.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Private Account
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">Profile & Account</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Manage your personal profile, institutional affiliations, and verification credentials.
          </p>
        </div>
        <button onClick={() => onNavigate('home')} className="pill">
          ← Home
        </button>
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* 1. Logged In View */}
      {currentUser && userProfile && viewState !== 'edit' && (
        <div className="card p-7 md:p-9 mt-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-soft">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl avatar flex items-center justify-center text-2xl font-black shadow-md">
                {userProfile.name
                  ? userProfile.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                  : 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                    {userProfile.role.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      userProfile.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : userProfile.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {userProfile.status === 'APPROVED'
                      ? '✓ Approved'
                      : userProfile.status === 'PENDING'
                      ? '⏳ Pending Review'
                      : userProfile.status}
                  </span>
                </div>
                <h2 className="text-2xl font-black navy mt-1">{userProfile.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {userProfile.jobRole
                    ? `${userProfile.jobRole} · ${userProfile.company}`
                    : `${userProfile.profileType} at ${userProfile.university}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={enterEditMode}
                className="border border-soft bg-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Edit Info
              </button>
              <button
                onClick={logout}
                className="bg-navy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Institutional Affiliation Prompt if Missing */}
          {(!userProfile.university || userProfile.university === '') && (
            <div className="mt-6 p-5 rounded-2xl bg-blue-50 border-2 border-blue-300 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <b className="navy text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  Institutional Affiliation Setup Needed
                </b>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Please specify your University and Department so your peers and batch mates can connect with you.
                </p>
              </div>
              <button
                onClick={enterEditMode}
                className="bg-navy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition shrink-0 shadow"
              >
                Set University & Dept →
              </button>
            </div>
          )}

          {/* Pending Review Notice */}
          {userProfile.status === 'PENDING' && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed flex items-center justify-between">
              <div>
                <b>Account Pending Administrator Verification:</b> As a newly registered{' '}
                {userProfile.profileType}, your institutional details are being reviewed by our team.
                Public edits will appear once approved.
              </div>
            </div>
          )}

          {/* Verification Badge Request */}
          {userProfile.profileType === 'Alumni' && !userProfile.isVerifiedAlumni && (
            <div className="mt-6 p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <b className="navy text-sm block">Want an Official Verified Alumni Badge?</b>
                <p className="text-xs text-slate-500 mt-1">
                  Submit proof of graduation (Certificate, Transcript or LinkedIn) for Super Admin
                  verification.
                </p>
              </div>
              <button
                onClick={() => setVerificationModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shrink-0"
              >
                Request Verification Badge →
              </button>
            </div>
          )}

          {/* Details Grid */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase">Email</span>
              <p className="text-sm font-semibold navy mt-1">{userProfile.email}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase">Profile Classification</span>
              <p className="text-sm font-semibold navy mt-1">{userProfile.profileType}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase">University</span>
              <p className="text-sm font-semibold navy mt-1">{userProfile.university || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase">Department</span>
              <p className="text-sm font-semibold navy mt-1">{userProfile.department || 'N/A'}</p>
            </div>

            {userProfile.studentId && (
              <div className="bg-slate-50 rounded-xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Student ID</span>
                <p className="text-sm font-semibold navy mt-1">{userProfile.studentId}</p>
              </div>
            )}

            {userProfile.profileType === 'Student' ? (
              <>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Current Year / Semester</span>
                  <p className="text-sm font-semibold navy mt-1">
                    {userProfile.studentYear || '2nd year, Semester 4'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Expected Graduation</span>
                  <p className="text-sm font-semibold navy mt-1">
                    {userProfile.expectedGraduation || '2028'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Graduation Year</span>
                  <p className="text-sm font-semibold navy mt-1">
                    {userProfile.graduationYear || '2023'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Current Role & Company</span>
                  <p className="text-sm font-semibold navy mt-1">
                    {userProfile.jobRole} {userProfile.company ? `at ${userProfile.company}` : ''}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Current Location</span>
                  <p className="text-sm font-semibold navy mt-1">
                    {userProfile.city ? `${userProfile.city}, ` : ''}
                    {userProfile.country || 'Bangladesh'}
                  </p>
                </div>
              </>
            )}

            {userProfile.bio && (
              <div className="bg-slate-50 rounded-xl p-4 sm:col-span-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Bio</span>
                <p className="text-sm text-slate-700 mt-1 leading-relaxed">{userProfile.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Logged Out Welcome View */}
      {!currentUser && viewState === 'default' && (
        <div className="min-h-[420px] flex items-center justify-center mt-6">
          <div className="card p-8 md:p-12 w-full max-w-lg text-center shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl font-black shadow-sm">
              A
            </div>
            <h2 className="text-2xl font-black navy mt-5">Welcome to AlumniSphere</h2>
            <p className="text-sm text-slate-500 mt-2">
              Log in to access your saved profile or create a new student / alumni account.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-7">
              <button
                onClick={() => setViewState('login')}
                className="bg-navy text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition"
              >
                Log in
              </button>
              <button
                onClick={() => setViewState('choice')}
                className="border border-soft bg-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
              >
                Sign up
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-soft">
              <button
                onClick={handleGoogleSignIn}
                className="w-full border border-soft rounded-xl py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Log In Form */}
      {!currentUser && viewState === 'login' && (
        <div className="max-w-md mx-auto mt-8">
          <div className="card p-7 shadow-xl">
            <button
              onClick={() => setViewState('default')}
              className="text-xs text-slate-500 hover:text-slate-800 transition mb-3"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-black navy">Log in</h2>
            <p className="text-xs text-slate-500 mt-1">
              Use your registered email address and password.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="account-input mt-1"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="account-input mt-1"
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-soft text-center">
              <button
                onClick={handleGoogleSignIn}
                className="text-xs text-slate-600 font-semibold hover:text-blue-600"
              >
                Or sign in with Google
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-5 text-center">
              New to AlumniSphere?{' '}
              <button
                onClick={() => setViewState('choice')}
                className="font-bold text-blue-600 hover:underline"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 4. Choice: Student vs Alumni */}
      {!currentUser && viewState === 'choice' && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="card p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black navy">Choose Account Type</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select which profile best matches your current academic standing.
                </p>
              </div>
              <button
                onClick={() => setViewState('default')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => {
                  setProfileType('Student');
                  setViewState('form');
                }}
                className="card p-6 text-left border-2 border-soft hover:border-blue-500 transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black group-hover:scale-105 transition">
                  S
                </div>
                <h3 className="text-xl font-black navy mt-4">I’m a Student</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Currently enrolled in a university program. Track semesters, discover senior alumni,
                  and access career mentorship.
                </p>
              </button>

              <button
                onClick={() => {
                  setProfileType('Alumni');
                  setViewState('form');
                }}
                className="card p-6 text-left border-2 border-soft hover:border-emerald-500 transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-black group-hover:scale-105 transition">
                  A
                </div>
                <h3 className="text-xl font-black navy mt-4">I’m an Alumni</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Graduated from a university. Share your professional career journey, reconnect with
                  cohorts, and receive verification badges.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Registration Form (Student or Alumni) */}
      {!currentUser && viewState === 'form' && (
        <div className="max-w-3xl mx-auto mt-8">
          <div className="card p-6 sm:p-9 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-soft">
              <div>
                <span className="pill text-blue-600 font-bold text-xs bg-blue-50">
                  {profileType} Registration
                </span>
                <h2 className="text-2xl font-black navy mt-2">Create your account</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Passwords are authenticated securely via Firebase. New accounts are submitted as
                  PENDING until approved.
                </p>
              </div>
              <button
                onClick={() => setViewState('choice')}
                className="text-xs text-blue-600 font-semibold"
              >
                Change type
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">Full Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="account-input mt-1"
                  placeholder="e.g. Nahian Al Mubin"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="account-input mt-1"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="account-input mt-1"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">University *</label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  required
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="" disabled>-- Select Your University --</option>
                  {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom University</option>
                </select>
                {university === 'OTHER' && (
                  <input
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    required
                    className="account-input mt-2"
                    placeholder="Enter your exact University name"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="" disabled>-- Select Your Department --</option>
                  {RAW_DEPARTMENT_CATALOG.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom Department</option>
                </select>
                {department === 'OTHER' && (
                  <input
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    required
                    className="account-input mt-2"
                    placeholder="Enter your exact Department name"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Student ID / Roll</label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. 230204101"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Education Level *</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="Undergraduate">Bachelor's / Undergraduate</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              {/* Student specific fields */}
              {profileType === 'Student' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Current Year / Semester *
                    </label>
                    <input
                      value={studentYear}
                      onChange={(e) => setStudentYear(e.target.value)}
                      required
                      className="account-input mt-1"
                      placeholder="e.g. 2nd year, Semester 4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Expected Graduation Year *
                    </label>
                    <input
                      value={expectedGraduation}
                      onChange={(e) => setExpectedGraduation(e.target.value)}
                      required
                      className="account-input mt-1"
                      placeholder="e.g. 2028"
                    />
                  </div>
                </>
              )}

              {/* Alumni specific fields */}
              {profileType === 'Alumni' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Graduation Year *</label>
                    <input
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      required
                      className="account-input mt-1"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Job Title / Role</label>
                    <input
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Company / Organization
                    </label>
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. Google, Brain Station 23"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Current Country</label>
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. Germany, Bangladesh, USA"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Current City</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. Berlin, Dhaka"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">LinkedIn Profile URL</label>
                    <input
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="account-input mt-1"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">Short Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="account-input mt-1"
                  placeholder="Share your interests, career ambitions, or research focus..."
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-4 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setViewState('choice')}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-navy text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Profile Form */}
      {currentUser && viewState === 'edit' && (
        <div className="max-w-3xl mx-auto mt-8">
          <div className="card p-6 sm:p-9 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-soft">
              <div>
                <h2 className="text-2xl font-black navy">Edit Profile Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your contact, location, and professional details.
                </p>
              </div>
              <button
                onClick={() => setViewState('default')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-6 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Full Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="account-input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">University *</label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  required
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="" disabled>-- Select University --</option>
                  {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom University</option>
                </select>
                {university === 'OTHER' && (
                  <input
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    required
                    className="account-input mt-2"
                    placeholder="Enter your exact University name"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="" disabled>-- Select Department --</option>
                  {RAW_DEPARTMENT_CATALOG.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom Department</option>
                </select>
                {department === 'OTHER' && (
                  <input
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    required
                    className="account-input mt-2"
                    placeholder="Enter your exact Department name"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Student ID / Roll</label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. 230204101"
                />
              </div>

              {userProfile?.profileType === 'Student' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Current Year / Semester</label>
                    <input
                      value={studentYear}
                      onChange={(e) => setStudentYear(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. 2nd Year, 4th Semester"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Expected Graduation</label>
                    <input
                      value={expectedGraduation}
                      onChange={(e) => setExpectedGraduation(e.target.value)}
                      className="account-input mt-1"
                      placeholder="e.g. 2027"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-600">Graduation Year</label>
                  <input
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="account-input mt-1"
                    placeholder="e.g. 2023"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600">Job Role</label>
                <input
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. Software Engineer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. Google, Brain Station 23"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="account-input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="account-input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">LinkedIn URL</label>
                <input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="account-input mt-1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="account-input mt-1"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setViewState('default')}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-navy text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Request Alumni Verification Badge</h3>
            <p className="text-xs text-slate-500 mt-1">
              Provide evidence of graduation for institutional review.
            </p>

            <form onSubmit={handleVerificationSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Verification Document / Proof Link *
                </label>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="account-input mt-1"
                  placeholder="https://drive.google.com/... or Certificate URL"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Additional Notes</label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="account-input mt-1"
                  placeholder="Student ID, graduating semester, department thesis advisor..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setVerificationModalOpen(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
