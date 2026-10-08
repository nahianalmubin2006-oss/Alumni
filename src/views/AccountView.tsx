import React, { useState } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG, getUniversityLogo, universityInitials } from '../data/initialData';
import { ProfileType, PostReactionType } from '../types';
import {
  Image as ImageIcon,
  Heart,
  ThumbsUp,
  Sparkles,
  Send,
  Trash2,
  Camera,
  Building2,
  Users,
  GraduationCap,
  MapPin,
  Briefcase,
  ExternalLink,
  Globe,
  CheckCircle2,
  MessageSquare,
  Plus,
  X,
  Upload,
  Link2,
} from 'lucide-react';

interface AccountViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
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

  const {
    submitVerificationRequest,
    posts,
    createPost,
    reactToPost,
    deletePost,
    toggleFollowUniversity,
    isFollowingUniversity,
    universities,
  } = useData();

  // Mode: 'signedOut', 'login', 'signupChoice', 'signupStudent', 'signupAlumni', 'edit'
  const [viewState, setViewState] = useState<'default' | 'login' | 'choice' | 'form' | 'edit'>('default');
  const [profileType, setProfileType] = useState<ProfileType>('Student');

  // Profile sub-tabs: 'posts' | 'followed' | 'dossier'
  const [profileTab, setProfileTab] = useState<'posts' | 'followed' | 'dossier'>('posts');

  // Post creation states
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostImageInputType, setNewPostImageInputType] = useState<'upload' | 'url'>('upload');
  const [isPosting, setIsPosting] = useState(false);
  const [postFilter, setPostFilter] = useState<'all' | 'mine'>('all');

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
        <div className="mt-8 space-y-6">
          {/* Top Profile Card with Campus Cover Banner */}
          <div className="card overflow-hidden shadow-xl border-soft">
            {/* Cover Banner */}
            <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-200 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  {userProfile.profileType} Identity
                </span>
                {userProfile.university && (
                  <span className="text-[11px] font-bold text-emerald-200 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>UGC Verified Affiliation</span>
                  </span>
                )}
              </div>
            </div>

            {/* Profile Avatar & Primary Info Row */}
            <div className="px-6 pb-6 pt-0 sm:px-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
                <div className="flex items-end gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-xl ring-4 ring-white border border-slate-200 overflow-hidden flex items-center justify-center font-black text-3xl text-blue-700 bg-gradient-to-tr from-blue-50 to-indigo-50">
                      {userProfile.photoUrl ? (
                        <img
                          src={userProfile.photoUrl}
                          alt={userProfile.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        userProfile.name
                          ? userProfile.name
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                          : 'U'
                      )}
                    </div>
                  </div>

                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl font-black navy">{userProfile.name}</h2>
                      {userProfile.isVerifiedAlumni && (
                        <span
                          className="p-1 rounded-full bg-blue-100 text-blue-700"
                          title="Verified Alumni Badge"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                      {userProfile.jobRole
                        ? `${userProfile.jobRole} ${userProfile.company ? `at ${userProfile.company}` : ''}`
                        : `${userProfile.profileType} · ${userProfile.department || 'General Faculty'}`}
                    </p>

                    {userProfile.university && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold mt-1">
                        {getUniversityLogo(userProfile.university) && (
                          <img
                            src={getUniversityLogo(userProfile.university)}
                            alt=""
                            className="w-4 h-4 object-contain inline"
                          />
                        )}
                        <span>{userProfile.university}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={enterEditMode}
                    className="border border-soft bg-white hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer"
                  >
                    ✏ Edit Profile
                  </button>
                  <button
                    onClick={logout}
                    className="bg-navy text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              </div>

              {/* Status and Institutional Affiliation Notice */}
              {(!userProfile.university || userProfile.university === '') && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <b className="navy font-bold">Institutional Affiliation Needed:</b> Please set
                    your university and department so your campus peers can connect.
                  </div>
                  <button
                    onClick={enterEditMode}
                    className="bg-navy text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800 transition shrink-0"
                  >
                    Set University →
                  </button>
                </div>
              )}

              {userProfile.status === 'PENDING' && (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <b>Account Pending Admin Review:</b> Your registration is currently awaiting verification
                  by administrators. Your profile is visible, but institutional badges will unlock upon approval.
                </div>
              )}
            </div>

            {/* Profile Navigation Tabs Bar */}
            <div className="flex items-center gap-2 px-6 sm:px-8 border-t border-soft bg-slate-50/70 pt-2 pb-2 text-xs overflow-x-auto">
              <button
                onClick={() => setProfileTab('posts')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  profileTab === 'posts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Posts & Campus Feed</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    profileTab === 'posts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {posts.length}
                </span>
              </button>

              <button
                onClick={() => setProfileTab('followed')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  profileTab === 'followed'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Followed Universities</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    profileTab === 'followed'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {userProfile.followedUniversities?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setProfileTab('dossier')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  profileTab === 'dossier'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academic Credentials & Info</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: POSTS & CAMPUS FEED (WITH IMAGE & LIVE REACTIONS) */}
          {/* ========================================================= */}
          {profileTab === 'posts' && (
            <div className="space-y-6">
              {/* Create Post Card */}
              <div className="card p-6 shadow-xl border-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {userProfile.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black navy">Share an Update or Campus Memory</h3>
                    <p className="text-[11px] text-slate-400">
                      Post thoughts, research breakthroughs, campus photos, or career milestones with your university network.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newPostContent.trim() && !newPostImage) return;
                    try {
                      setIsPosting(true);
                      await createPost({
                        userId: currentUser.uid,
                        authorName: userProfile.name,
                        authorEmail: userProfile.email,
                        authorRole: userProfile.role,
                        authorUniversity: userProfile.university,
                        authorDepartment: userProfile.department,
                        authorPhotoUrl: userProfile.photoUrl,
                        content: newPostContent.trim(),
                        imageUrl: newPostImage || undefined,
                      });
                      setNewPostContent('');
                      setNewPostImage('');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsPosting(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <textarea
                    rows={3}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What would you like to share with your university community? (e.g. thesis completed, new role, research paper, campus event...)"
                    className="w-full text-xs sm:text-sm border border-soft rounded-xl p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none bg-white"
                  />

                  {/* Image Attachment Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-soft">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Attach Image:</span>
                      </span>

                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setNewPostImageInputType('upload')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                            newPostImageInputType === 'upload'
                              ? 'bg-white shadow-xs text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          <Upload className="w-3 h-3 inline mr-1" />
                          File
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPostImageInputType('url')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                            newPostImageInputType === 'url'
                              ? 'bg-white shadow-xs text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          <Link2 className="w-3 h-3 inline mr-1" />
                          URL
                        </button>
                      </div>

                      {newPostImageInputType === 'upload' ? (
                        <label className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg font-bold cursor-pointer border border-blue-200">
                          <span>Browse Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 3 * 1024 * 1024) {
                                alert('Image must be under 3MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewPostImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      ) : (
                        <input
                          type="url"
                          placeholder="Paste image URL (https://...)"
                          value={newPostImage}
                          onChange={(e) => setNewPostImage(e.target.value)}
                          className="border border-soft rounded-lg px-2.5 py-1 text-xs outline-none bg-white w-48 sm:w-64"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPosting || (!newPostContent.trim() && !newPostImage)}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isPosting ? 'Publishing...' : 'Publish Post'}</span>
                    </button>
                  </div>

                  {/* Attached Image Preview */}
                  {newPostImage && (
                    <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-56">
                      <img
                        src={newPostImage}
                        alt="Preview"
                        className="max-h-56 object-contain rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPostImage('')}
                        className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Feed Controls */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">View Feed:</span>
                  <button
                    onClick={() => setPostFilter('all')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition ${
                      postFilter === 'all'
                        ? 'bg-navy text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-soft hover:bg-slate-50'
                    }`}
                  >
                    All Community Posts ({posts.length})
                  </button>
                  <button
                    onClick={() => setPostFilter('mine')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition ${
                      postFilter === 'mine'
                        ? 'bg-navy text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-soft hover:bg-slate-50'
                    }`}
                  >
                    My Posts ({posts.filter((p) => p.userId === currentUser.uid).length})
                  </button>
                </div>
              </div>

              {/* Posts List */}
              <div className="space-y-4">
                {posts
                  .filter((p) => (postFilter === 'mine' ? p.userId === currentUser.uid : true))
                  .length === 0 ? (
                  <div className="card p-12 text-center text-slate-400">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold navy text-sm">No posts yet in this feed.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Be the first to share a campus achievement, photo, or question above!
                    </p>
                  </div>
                ) : (
                  posts
                    .filter((p) => (postFilter === 'mine' ? p.userId === currentUser.uid : true))
                    .map((post) => {
                      const isOwnPost = post.userId === currentUser.uid;
                      const reactionsDef: {
                        type: PostReactionType;
                        emoji: string;
                        label: string;
                        activeColor: string;
                      }[] = [
                        { type: 'like', emoji: '👍', label: 'Like', activeColor: 'bg-blue-100 text-blue-700 border-blue-300' },
                        { type: 'love', emoji: '❤️', label: 'Love', activeColor: 'bg-rose-100 text-rose-700 border-rose-300' },
                        { type: 'scholar', emoji: '🎓', label: 'Scholar', activeColor: 'bg-purple-100 text-purple-700 border-purple-300' },
                        { type: 'insightful', emoji: '💡', label: 'Insightful', activeColor: 'bg-amber-100 text-amber-700 border-amber-300' },
                        { type: 'celebrate', emoji: '👏', label: 'Celebrate', activeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      ];

                      return (
                        <div key={post.id} className="card p-5 shadow-lg border-soft space-y-3">
                          {/* Post Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-sm shadow-xs overflow-hidden">
                                {post.authorPhotoUrl ? (
                                  <img
                                    src={post.authorPhotoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  post.authorName?.charAt(0) || 'M'
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <b className="navy text-sm">{post.authorName}</b>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                    {post.authorRole}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {post.authorUniversity && (
                                    <span className="font-medium text-slate-500">
                                      {post.authorUniversity}
                                      {post.authorDepartment ? ` · ${post.authorDepartment}` : ''} •{' '}
                                    </span>
                                  )}
                                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Delete Option for Author */}
                            {isOwnPost && (
                              <button
                                onClick={() => deletePost(post.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                                title="Delete post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Content */}
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>

                          {/* Attached Image */}
                          {post.imageUrl && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-96">
                              <img
                                src={post.imageUrl}
                                alt="Post media"
                                className="w-full max-h-96 object-cover hover:scale-101 transition duration-200"
                              />
                            </div>
                          )}

                          {/* Interactive Reactions Bar */}
                          <div className="pt-2 border-t border-soft flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {reactionsDef.map((r) => {
                                const list = post.reactions?.[r.type] || [];
                                const count = list.length;
                                const hasReacted = list.includes(currentUser.uid);

                                return (
                                  <button
                                    key={r.type}
                                    type="button"
                                    onClick={() => reactToPost(post.id, r.type)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer border ${
                                      hasReacted
                                        ? `${r.activeColor} shadow-xs font-bold scale-105`
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                    title={`${r.label}: ${count} reaction(s)`}
                                  >
                                    <span>{r.emoji}</span>
                                    {count > 0 && (
                                      <span className="text-[11px] font-black">{count}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <span className="text-[11px] text-slate-400">
                              {Object.values(post.reactions || {}).flat().length} total reaction(s)
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: FOLLOWED UNIVERSITIES (WITH DISTINCT METRICS)      */}
          {/* ========================================================= */}
          {profileTab === 'followed' && (
            <div className="space-y-6">
              <div className="card p-6 shadow-xl border-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
                  <div>
                    <h3 className="text-base font-black navy">My Followed Universities</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Institutions you actively track for breakthroughs, research wires, and alumni developments.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('universities')}
                    className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Browse All Universities</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(!userProfile.followedUniversities || userProfile.followedUniversities.length === 0) ? (
                  <div className="py-12 text-center">
                    <Building2 className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                    <h4 className="font-bold navy text-sm">No Universities Followed Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Follow universities to stay informed about their verified alumni outcomes,
                      faculty research, and campus news.
                    </p>

                    {/* Suggestions */}
                    <div className="mt-6 pt-6 border-t border-soft">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                        Suggested to Follow:
                      </span>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['University of Dhaka', 'Bangladesh University of Engineering & Technology', 'North South University', 'Jahangirnagar University'].map(
                          (name) => (
                            <button
                              key={name}
                              onClick={() => toggleFollowUniversity(name)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Follow {name.includes('Dhaka') ? 'Dhaka University (DU)' : name}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    {userProfile.followedUniversities.map((uniName) => {
                      const uniData =
                        universities.find((u) => u.name.toLowerCase() === uniName.toLowerCase()) || {
                          name: uniName,
                          type: 'Public' as const,
                          location: 'Dhaka, Bangladesh',
                          alumniCount: 8920,
                          studentCount: 37500,
                          followersCount: 14200,
                          employmentRate: 85,
                        };

                      const logo = getUniversityLogo(uniName);

                      return (
                        <div
                          key={uniName}
                          className="p-5 rounded-2xl border border-soft bg-white shadow-sm hover:shadow-md transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden p-1 shadow-xs">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt=""
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  universityInitials(uniName)
                                )}
                              </div>
                              <div>
                                <b className="navy text-sm block leading-snug">{uniName}</b>
                                <span className="text-xs text-slate-400 block mt-0.5">
                                  {uniData.location || 'Bangladesh'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => toggleFollowUniversity(uniName)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
                              title="Unfollow this campus"
                            >
                              Unfollow
                            </button>
                          </div>

                          {/* Distinct Counts: Followers, Alumni, and Students */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-soft">
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Followers
                              </span>
                              <b className="text-blue-600 text-xs block mt-0.5">
                                {uniData.followersCount?.toLocaleString() || '14,200'}
                              </b>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Alumni
                              </span>
                              <b className="navy text-xs block mt-0.5">
                                {uniData.alumniCount?.toLocaleString() || '8,920'}
                              </b>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Students
                              </span>
                              <b className="text-indigo-600 text-xs block mt-0.5">
                                {uniData.studentCount?.toLocaleString() || '37,500'}
                              </b>
                            </div>
                          </div>

                          <button
                            onClick={() => onNavigate('universityDetail', { name: uniName })}
                            className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Explore Campus Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ACADEMIC CREDENTIALS & INFO DOSSIER                */}
          {/* ========================================================= */}
          {profileTab === 'dossier' && (
            <div className="card p-7 shadow-xl border-soft space-y-6">
              {/* Verification Badge Request */}
              {userProfile.profileType === 'Alumni' && !userProfile.isVerifiedAlumni && (
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <b className="navy text-sm block">Want an Official Verified Alumni Badge?</b>
                    <p className="text-xs text-slate-500 mt-1">
                      Submit proof of graduation (Certificate, Transcript or LinkedIn) for Super Admin
                      verification.
                    </p>
                  </div>
                  <button
                    onClick={() => setVerificationModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shrink-0 cursor-pointer"
                  >
                    Request Verification Badge →
                  </button>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Email (Gmail / Academic)</span>
                  <p className="text-sm font-semibold navy mt-1">{userProfile.email}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Profile Classification</span>
                  <p className="text-sm font-semibold navy mt-1">{userProfile.profileType}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">University Affiliation</span>
                  <p className="text-sm font-semibold navy mt-1">{userProfile.university || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Department / Faculty</span>
                  <p className="text-sm font-semibold navy mt-1">{userProfile.department || 'N/A'}</p>
                </div>

                {userProfile.studentId && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Student Registration / ID</span>
                    <p className="text-sm font-semibold navy mt-1 font-mono">{userProfile.studentId}</p>
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
