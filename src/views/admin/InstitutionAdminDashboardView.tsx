import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  Building2,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Globe,
  Users,
  RefreshCw,
  Plus,
  Save,
  Trash2,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  Pencil,
} from 'lucide-react';

interface InstitutionAdminDashboardViewProps {
  onNavigatePublic: () => void;
  onLogoutSuccess: () => void;
}

interface DepartmentItem {
  id: string;
  name: string;
  university: string;
  group?: string;
  faculty?: string;
  status?: string;
  logoUrl?: string;
  description?: string;
  updatedAt?: string;
}

interface InstitutionCatalog {
  scope: { role: string; university: string; department: string | null };
  university: {
    id: string;
    name: string;
    shortName?: string;
    location?: string;
    logoUrl?: string;
    website?: string;
    description?: string;
  } | null;
  departments: DepartmentItem[];
  departmentNames: string[];
}

interface ScopedAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  assignedUniversity?: string;
  assignedDepartment?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AdminApplication {
  id: string;
  type: string;
  name: string;
  email: string;
  university?: string;
  department?: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  departments: number;
  activeAdmins: number;
  pendingApplications: number;
}

type Tab = 'overview' | 'departments' | 'university' | 'admins';

const emptyCatalog: InstitutionCatalog = {
  scope: { role: '', university: '', department: null },
  university: null,
  departments: [],
  departmentNames: [],
};

export const InstitutionAdminDashboardView: React.FC<InstitutionAdminDashboardViewProps> = ({
  onNavigatePublic,
  onLogoutSuccess,
}) => {
  const { adminUser, logoutAdmin, apiFetch } = useAdmin();
  const role = adminUser?.role;
  const isDepartment = role === 'DEPARTMENT_ADMIN';
  const isUniversity = role === 'UNIVERSITY_ADMIN';
  const scopeUniversity = adminUser?.assignedUniversity || adminUser?.university || 'Not assigned';
  const scopeDepartment = adminUser?.assignedDepartment || adminUser?.department;
  const [tab, setTab] = useState<Tab>('overview');
  const [catalog, setCatalog] = useState<InstitutionCatalog>(emptyCatalog);
  const [stats, setStats] = useState<DashboardStats>({ departments: 0, activeAdmins: 0, pendingApplications: 0 });
  const [admins, setAdmins] = useState<ScopedAdmin[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentGroup, setNewDepartmentGroup] = useState('General');
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [universityForm, setUniversityForm] = useState({
    shortName: '',
    location: '',
    website: '',
    logoUrl: '',
    description: '',
  });

  const requestJson = useCallback(async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const response = await apiFetch(endpoint, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data as T;
  }, [apiFetch]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, nextCatalog, adminData] = await Promise.all([
        requestJson<{ stats: DashboardStats }>('/api/institution/dashboard'),
        requestJson<InstitutionCatalog>('/api/institution/catalog'),
        requestJson<{ admins: ScopedAdmin[]; applications: AdminApplication[] }>('/api/institution/admins'),
      ]);
      setStats(dashboard.stats || { departments: 0, activeAdmins: 0, pendingApplications: 0 });
      setCatalog(nextCatalog);
      setAdmins(adminData.admins || []);
      setApplications(adminData.applications || []);
      setUniversityForm({
        shortName: nextCatalog.university?.shortName || '',
        location: nextCatalog.university?.location || '',
        website: nextCatalog.university?.website || '',
        logoUrl: nextCatalog.university?.logoUrl || '',
        description: nextCatalog.university?.description || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your institution workspace.');
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleDepartments = useMemo<DepartmentItem[]>(() => {
    const records = catalog.departments || [];
    return (catalog.departmentNames || []).map((name) => {
      const existing = records.find((item) => item.name.toLowerCase() === name.toLowerCase());
      return existing || {
        id: 'dept-' + encodeURIComponent((scopeUniversity + '-' + name).toLowerCase().replace(/[^a-z0-9]/g, '-')),
        name,
        university: scopeUniversity,
        group: 'General',
        status: 'Active',
      };
    }).filter((item, index, all) => all.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index);
  }, [catalog, scopeUniversity]);

  const handleLogout = async () => {
    await logoutAdmin();
    onLogoutSuccess();
  };

  const saveUniversity = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/institution/university', {
        method: 'PUT',
        body: JSON.stringify({ name: scopeUniversity, ...universityForm }),
      });
      setNotice('University profile saved.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save university profile.');
    } finally {
      setSaving(false);
    }
  };

  const createDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newDepartmentName.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/institution/departments', {
        method: 'POST',
        body: JSON.stringify({ name: newDepartmentName.trim(), group: newDepartmentGroup }),
      });
      setNewDepartmentName('');
      setNewDepartmentGroup('General');
      setNotice('Department created in your university catalogue.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department.');
    } finally {
      setSaving(false);
    }
  };

  const saveDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDepartment) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/institution/departments/' + encodeURIComponent(editingDepartment.id), {
        method: 'PUT',
        body: JSON.stringify({
          name: editingDepartment.name,
          university: scopeUniversity,
          group: editingDepartment.group || 'General',
          faculty: editingDepartment.faculty || '',
          status: editingDepartment.status || 'Active',
          logoUrl: editingDepartment.logoUrl || '',
          description: editingDepartment.description || '',
        }),
      });
      setEditingDepartment(null);
      setNotice('Department details saved.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save department.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (department: DepartmentItem) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/institution/departments/' + encodeURIComponent(department.id), { method: 'DELETE' });
      setNotice('Department removed.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove department.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'departments', label: 'Departments', icon: <GraduationCap className="w-4 h-4" /> },
    ...(isUniversity ? [{ id: 'university' as Tab, label: 'University profile', icon: <Building2 className="w-4 h-4" /> }] : []),
    { id: 'admins', label: 'Admins', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <h1 className="font-black text-base">AlumniSphere Admin Portal</h1>
            <p className="text-xs text-slate-400">Scoped institution workspace</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onNavigatePublic} className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800">Public website</button>
          <button onClick={() => void reload()} disabled={loading} className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} /></button>
          <button onClick={handleLogout} className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Approved assignment
              </div>
              <h2 className="text-3xl font-black mt-4">{isDepartment ? 'Department Admin Dashboard' : 'University Admin Dashboard'}</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Signed in as {adminUser?.name || 'Administrator'}. All management requests are checked against your approved server-side assignment.
              </p>
            </div>
            <span className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-xs text-blue-200 font-bold">
              {role?.replaceAll('_', ' ')}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider"><Building2 className="w-4 h-4" /> Assigned university</div>
              <p className="text-lg font-extrabold mt-3">{scopeUniversity}</p>
            </div>
            {isDepartment && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider"><GraduationCap className="w-4 h-4" /> Assigned department</div>
                <p className="text-lg font-extrabold mt-3">{scopeDepartment || 'Not assigned'}</p>
              </div>
            )}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider"><Globe className="w-4 h-4" /> Account</div>
              <p className="font-bold mt-3">{adminUser?.email}</p>
              <p className="text-xs text-slate-500 mt-1">Only assigned institution data is available in this workspace.</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 mt-6" aria-label="Institution admin sections">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={'inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold ' + (tab === item.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800')}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
        {notice && <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="w-5 h-5 shrink-0" />{notice}</div>}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">Loading your scoped workspace…</div>
        ) : (
          <>
            {tab === 'overview' && (
              <section className="mt-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: isDepartment ? 'Assigned department' : 'Departments', value: stats.departments, icon: <GraduationCap className="w-5 h-5" /> },
                    { label: 'Active institution admins', value: stats.activeAdmins, icon: <Users className="w-5 h-5" /> },
                    { label: 'Pending admin applications', value: stats.pendingApplications, icon: <ShieldCheck className="w-5 h-5" /> },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold"><span>{metric.label}</span><span className="text-blue-300">{metric.icon}</span></div>
                      <p className="text-3xl font-black mt-3">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="font-bold">Your permissions</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    <li>• {isUniversity ? 'Manage department catalogue and your university profile.' : 'Manage metadata for your assigned department only.'}</li>
                    <li>• View institution administrator assignments within your permitted scope.</li>
                    <li>• Admin role assignments and approvals remain controlled through the central approval workflow.</li>
                    <li>• Central platform users, global settings, and other institutions are not exposed here.</li>
                  </ul>
                </div>
              </section>
            )}

            {tab === 'university' && isUniversity && (
              <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
                <h3 className="text-lg font-black">University profile</h3>
                <p className="text-xs text-slate-400 mt-1">The university identity is locked to your approved assignment.</p>
                <form onSubmit={saveUniversity} className="grid sm:grid-cols-2 gap-4 mt-5">
                  <label className="text-xs font-bold text-slate-300">University name (locked)<input value={scopeUniversity} readOnly className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-500" /></label>
                  <label className="text-xs font-bold text-slate-300">Short name<input value={universityForm.shortName} onChange={(e) => setUniversityForm((v) => ({ ...v, shortName: e.target.value }))} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
                  <label className="text-xs font-bold text-slate-300">Location<input value={universityForm.location} onChange={(e) => setUniversityForm((v) => ({ ...v, location: e.target.value }))} maxLength={240} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
                  <label className="text-xs font-bold text-slate-300">Website URL<input type="url" value={universityForm.website} onChange={(e) => setUniversityForm((v) => ({ ...v, website: e.target.value }))} maxLength={1000} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
                  <label className="text-xs font-bold text-slate-300 sm:col-span-2">Logo URL<input type="url" value={universityForm.logoUrl} onChange={(e) => setUniversityForm((v) => ({ ...v, logoUrl: e.target.value }))} maxLength={1000} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
                  <label className="text-xs font-bold text-slate-300 sm:col-span-2">Description<textarea value={universityForm.description} onChange={(e) => setUniversityForm((v) => ({ ...v, description: e.target.value }))} maxLength={4000} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
                  <div className="sm:col-span-2"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save university profile'}</button></div>
                </form>
              </section>
            )}

            {tab === 'departments' && (
              <section className="mt-6">
                {isUniversity && (
                  <form onSubmit={createDepartment} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-4">
                    <h3 className="font-black">Add a department</h3>
                    <p className="text-xs text-slate-400 mt-1">The server attaches the department to {scopeUniversity}; the request cannot choose another university.</p>
                    <div className="grid sm:grid-cols-[1fr_200px_auto] gap-3 mt-4">
                      <input required value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} maxLength={160} placeholder="Department name" className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
                      <input value={newDepartmentGroup} onChange={(e) => setNewDepartmentGroup(e.target.value)} maxLength={120} placeholder="Faculty / group" className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
                      <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold disabled:opacity-50"><Plus className="w-4 h-4" />Add</button>
                    </div>
                  </form>
                )}
                <div className="grid lg:grid-cols-2 gap-4">
                  {visibleDepartments.map((department) => (
                    <article key={department.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{department.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{department.faculty || department.group || 'Department'} · {department.status || 'Active'}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{department.university}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setEditingDepartment({ ...department })} className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800" aria-label={'Edit ' + department.name}><Pencil className="w-4 h-4" /></button>
                          {isUniversity && <button onClick={() => void deleteDepartment(department)} disabled={saving} className="p-2 rounded-lg border border-rose-500/30 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50" aria-label={'Remove ' + department.name}><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </div>
                      {department.description && <p className="text-xs text-slate-400 mt-3">{department.description}</p>}
                    </article>
                  ))}
                  {visibleDepartments.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400 lg:col-span-2">No departments are listed in the server catalogue yet.</div>}
                </div>
              </section>
            )}

            {tab === 'admins' && (
              <section className="mt-6 space-y-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="font-black">Institution administrators</h3>
                  <p className="text-xs text-slate-400 mt-1">This list is filtered by your approved university and department scope. Role changes are reserved for the central approval workflow.</p>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase"><tr><th className="py-3 pr-4">Administrator</th><th className="py-3 pr-4">Role</th><th className="py-3 pr-4">Department</th><th className="py-3">Status</th></tr></thead>
                      <tbody>
                        {admins.map((item) => (
                          <tr key={item.id} className="border-t border-slate-800">
                            <td className="py-3 pr-4"><p className="font-bold text-slate-200">{item.name}</p><p className="text-slate-500 mt-1">{item.email}</p></td>
                            <td className="py-3 pr-4">{item.role.replaceAll('_', ' ')}</td>
                            <td className="py-3 pr-4">{item.assignedDepartment || item.assignedUniversity || item.assignedUniversity || '—'}</td>
                            <td className="py-3"><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">{item.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {admins.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No other institution administrators are assigned in this scope.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="font-black">Admin access requests</h3>
                  <p className="text-xs text-slate-400 mt-1">Requests are informational here; central administrators approve or reject access.</p>
                  <div className="mt-4 space-y-3">
                    {applications.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 p-4">
                        <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-slate-400 mt-1">{item.email} · {item.type.replaceAll('_', ' ')}</p><p className="text-[11px] text-slate-500 mt-1">{item.department || item.university}</p></div>
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-200">{item.status}</span>
                      </div>
                    ))}
                    {applications.length === 0 && <p className="py-5 text-center text-sm text-slate-500">No access requests are recorded for this scope.</p>}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {editingDepartment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <form onSubmit={saveDepartment} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-lg font-black">Edit department</h3><p className="text-xs text-slate-400 mt-1">Department name and university scope are locked.</p></div>
                <button type="button" onClick={() => setEditingDepartment(null)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs">Close</button>
              </div>
              <label className="block text-xs font-bold text-slate-300 mt-5">Department name<input readOnly value={editingDepartment.name} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-500" /></label>
              <label className="block text-xs font-bold text-slate-300 mt-4">Faculty<input value={editingDepartment.faculty || ''} onChange={(e) => setEditingDepartment((v) => v ? { ...v, faculty: e.target.value } : v)} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
              <label className="block text-xs font-bold text-slate-300 mt-4">Group<input value={editingDepartment.group || ''} onChange={(e) => setEditingDepartment((v) => v ? { ...v, group: e.target.value } : v)} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
              <label className="block text-xs font-bold text-slate-300 mt-4">Status<select value={editingDepartment.status || 'Active'} onChange={(e) => setEditingDepartment((v) => v ? { ...v, status: e.target.value } : v)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm"><option>Active</option><option>Inactive</option><option>Pending verification</option></select></label>
              <label className="block text-xs font-bold text-slate-300 mt-4">Logo URL<input type="url" value={editingDepartment.logoUrl || ''} onChange={(e) => setEditingDepartment((v) => v ? { ...v, logoUrl: e.target.value } : v)} maxLength={1000} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
              <label className="block text-xs font-bold text-slate-300 mt-4">Description<textarea value={editingDepartment.description || ''} onChange={(e) => setEditingDepartment((v) => v ? { ...v, description: e.target.value } : v)} maxLength={4000} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" /></label>
              <button disabled={saving} type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save department'}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
