import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Building2, GraduationCap, LogOut, ShieldCheck, Globe } from 'lucide-react';

interface InstitutionAdminDashboardViewProps {
  onNavigatePublic: () => void;
  onLogoutSuccess: () => void;
}

export const InstitutionAdminDashboardView: React.FC<InstitutionAdminDashboardViewProps> = ({
  onNavigatePublic,
  onLogoutSuccess,
}) => {
  const { adminUser, logoutAdmin } = useAdmin();
  const role = adminUser?.role;
  const isDepartment = role === 'DEPARTMENT_ADMIN';
  const scopeUniversity = adminUser?.assignedUniversity || adminUser?.university || 'Not assigned';
  const scopeDepartment = adminUser?.assignedDepartment || adminUser?.department;

  const handleLogout = async () => {
    await logoutAdmin();
    onLogoutSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <h1 className="font-black text-base">AlumniSphere Admin Portal</h1>
            <p className="text-xs text-slate-400">Institution workspace</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onNavigatePublic} className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800">Public website</button>
          <button onClick={handleLogout} className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Approved assignment
          </div>
          <h2 className="text-3xl font-black mt-4">{isDepartment ? 'Department Admin Dashboard' : 'University Admin Dashboard'}</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Signed in as {adminUser?.name || 'Administrator'}. Your access is limited to the institution scope listed below; this account cannot open the central administration workspace.
          </p>

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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:col-span-2">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider"><Globe className="w-4 h-4" /> Account</div>
              <p className="font-bold mt-3">{adminUser?.email}</p>
              <p className="text-xs text-slate-500 mt-1">{role?.replaceAll('_', ' ')} · Active</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h3 className="text-sm font-bold text-amber-200">Scoped management rollout</h3>
          <p className="text-xs leading-relaxed text-slate-400 mt-2">
            Your approved role and exact scope are now recorded server-side. University/department editing controls will be enabled only after their individual API and database rules enforce this scope, so no central-management permissions are exposed in this workspace.
          </p>
        </div>
      </main>
    </div>
  );
};
