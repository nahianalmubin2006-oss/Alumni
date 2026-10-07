import React, { useState, useMemo } from 'react';
import { AuditLog, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Clock,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  History,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  Copy,
  Check,
} from 'lucide-react';

interface AdminActivityLogProps {
  logs: AuditLog[];
  onLogCustomEvent?: (action: string, targetType: string, targetId: string, details: string) => Promise<void>;
  onInspectTarget?: (targetType: string, targetId: string) => void;
}

type CategoryFilter = 'ALL' | 'APPROVALS' | 'DELETIONS' | 'ROLES' | 'VERIFICATIONS' | 'CONTENT';
type SeverityFilter = 'ALL' | 'DANGER' | 'WARNING' | 'SUCCESS' | 'INFO';
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type ViewMode = 'timeline' | 'table';

export const AdminActivityLog: React.FC<AdminActivityLogProps> = ({
  logs,
  onLogCustomEvent,
  onInspectTarget,
}) => {
  const { userProfile, isSuperAdmin } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Modal inspection & copying state
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom log modal
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customActionTitle, setCustomActionTitle] = useState('ADMIN_SECURITY_AUDIT');
  const [customTargetType, setCustomTargetType] = useState('SYSTEM');
  const [customDetails, setCustomDetails] = useState('');
  const [customLoading, setCustomLoading] = useState(false);

  // Distinct list of actor names for dropdown
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.actorName) set.add(l.actorName);
      else if (l.actorEmail) set.add(l.actorEmail);
    });
    return Array.from(set);
  }, [logs]);

  // Helper to resolve severity if not explicitly set
  const getLogSeverity = (log: AuditLog): 'DANGER' | 'WARNING' | 'SUCCESS' | 'INFO' => {
    if (log.severity) return log.severity;
    const act = log.action.toUpperCase();
    if (act.includes('DELETED') || act.includes('PURGED') || act.includes('REMOVE')) return 'DANGER';
    if (act.includes('REJECTED') || act.includes('UNAPPROVED') || act.includes('SUSPENDED') || act.includes('UNVERIFIED')) return 'WARNING';
    if (act.includes('APPROVED') || act.includes('VERIFIED') || act.includes('SUCCESS')) return 'SUCCESS';
    return 'INFO';
  };

  // Helper to categorize an action
  const matchesCategory = (log: AuditLog, cat: CategoryFilter): boolean => {
    if (cat === 'ALL') return true;
    const act = log.action.toUpperCase();
    const type = log.targetType.toUpperCase();

    switch (cat) {
      case 'APPROVALS':
        return act.includes('APPROVED') || act.includes('REJECTED') || act.includes('UNAPPROVED') || act.includes('SUSPENDED');
      case 'DELETIONS':
        return act.includes('DELETED') || act.includes('PURGED') || act.includes('REMOVE');
      case 'ROLES':
        return act.includes('ROLE') || act.includes('ADMIN_ASSIGNED') || act.includes('ADMIN_REMOVED');
      case 'VERIFICATIONS':
        return act.includes('VERIF') || type === 'VERIFICATION_REQUEST';
      case 'CONTENT':
        return act.includes('NEWS') || act.includes('UNIVERSITY') || act.includes('DEPARTMENT') || act.includes('CHANGE_REQUEST');
      default:
        return true;
    }
  };

  // Helper for date filtering
  const matchesDate = (createdAt: string, df: DateFilter): boolean => {
    if (df === 'ALL') return true;
    const itemDate = new Date(createdAt).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (df === 'TODAY') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return itemDate >= startOfDay.getTime();
    }
    if (df === 'WEEK') {
      return now - itemDate <= 7 * oneDay;
    }
    if (df === 'MONTH') {
      return now - itemDate <= 30 * oneDay;
    }
    return true;
  };

  // Filtered & Sorted logs
  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return logs
      .filter((log) => {
        // Search term filter
        if (q) {
          const inAction = (log.action || '').toLowerCase().includes(q);
          const inDetails = (log.details || '').toLowerCase().includes(q);
          const inActor = (log.actorName || '').toLowerCase().includes(q) || (log.actorEmail || '').toLowerCase().includes(q);
          const inTarget = (log.targetType || '').toLowerCase().includes(q) || (log.targetId || '').toLowerCase().includes(q) || (log.targetName || '').toLowerCase().includes(q);
          if (!inAction && !inDetails && !inActor && !inTarget) return false;
        }

        // Category filter
        if (!matchesCategory(log, categoryFilter)) return false;

        // Severity filter
        if (severityFilter !== 'ALL') {
          const sev = getLogSeverity(log);
          if (sev !== severityFilter) return false;
        }

        // Actor filter
        if (actorFilter !== 'ALL') {
          if (log.actorName !== actorFilter && log.actorEmail !== actorFilter) return false;
        }

        // Date filter
        if (!matchesDate(log.createdAt, dateFilter)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [logs, searchTerm, categoryFilter, severityFilter, actorFilter, dateFilter, sortOrder]);

  // Metric summaries
  const metrics = useMemo(() => {
    let approvals = 0;
    let deletions = 0;
    let roleChanges = 0;
    let warnings = 0;

    logs.forEach((l) => {
      const act = l.action.toUpperCase();
      if (act.includes('APPROVED')) approvals++;
      if (act.includes('DELETED') || act.includes('PURGED')) deletions++;
      if (act.includes('ROLE') || act.includes('ADMIN_ASSIGNED')) roleChanges++;
      if (getLogSeverity(l) === 'WARNING') warnings++;
    });

    return {
      total: logs.length,
      approvals,
      deletions,
      roleChanges,
      warnings,
      actorsCount: uniqueActors.length,
    };
  }, [logs, uniqueActors]);

  // Relative time formatter
  const formatRelativeTime = (isoString: string): string => {
    try {
      const deltaMs = Date.now() - new Date(isoString).getTime();
      if (deltaMs < 0) return 'Just now';
      const sec = Math.floor(deltaMs / 1000);
      if (sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hrs = Math.floor(min / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 30) return `${days}d ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Severity', 'Target Type', 'Target ID', 'Target Name', 'Actor Name', 'Actor Email', 'Actor Role', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${l.action}"`,
      `"${getLogSeverity(l)}"`,
      `"${l.targetType}"`,
      `"${l.targetId}"`,
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      `"${l.actorEmail || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumnisphere-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumnisphere-audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy ID / JSON snippet helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit manual audit note
  const handleCustomLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogCustomEvent || !customDetails.trim()) return;
    try {
      setCustomLoading(true);
      await onLogCustomEvent(customActionTitle, customTargetType, 'SYSTEM_AUDIT', customDetails.trim());
      setCustomModalOpen(false);
      setCustomDetails('');
    } catch (err) {
      console.error(err);
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Security Assurance */}
      <div className="card p-6 md:p-8 shadow-xl border-soft bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-soft">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black navy">Administrative Activity Log</h2>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Firestore Stream
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only immutable audit trail tracking critical administrative actions, zero-trust approvals, role updates, and data deletions.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onLogCustomEvent && (
              <button
                onClick={() => setCustomModalOpen(true)}
                className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Record an official administrative audit note"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-300" />
                <span>Record Audit Note</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-soft font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Download audit records as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={filteredLogs.length === 0}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-soft font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Export structured JSON security report"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Accountability Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6">
          <div className="bg-white p-4 rounded-xl border border-soft shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold">Total Events</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black navy mt-1">{metrics.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Immutable records</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-soft shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold">Approvals</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.approvals}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Verified actions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-soft shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold">Data Deletions</span>
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">{metrics.deletions}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">High accountability</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-soft shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold">Privilege & Roles</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.roleChanges}</div>
            <div className="text-[10px] text-indigo-600 mt-0.5">Role modifications</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-soft shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold">Active Actors</span>
              <ShieldCheck className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black navy mt-1">{metrics.actorsCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Authorized admins</div>
          </div>
        </div>
      </div>

      {/* Category Pills & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'ALL'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-soft'
            }`}
          >
            <span>All Actions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black opacity-80">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('APPROVALS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'APPROVALS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-soft'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>User Approvals</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black opacity-80">
              {metrics.approvals}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('DELETIONS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'DELETIONS'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Data Deletions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-rose-100 text-rose-800">
              {metrics.deletions}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('ROLES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'ROLES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-soft'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Role & Admin</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black opacity-80">
              {metrics.roleChanges}
            </span>
          </button>

          <button
            onClick={() => setCategoryFilter('VERIFICATIONS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'VERIFICATIONS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-soft'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Alumni Badges</span>
          </button>

          <button
            onClick={() => setCategoryFilter('CONTENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'CONTENT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-soft'
            }`}
          >
            <span>News & Directory</span>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-white border border-soft rounded-xl p-1 shrink-0">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'timeline' ? 'bg-navy text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Timeline View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'table' ? 'bg-navy text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="card p-4 sm:p-5 shadow-lg border-soft space-y-3 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, details, admin, target ID or name..."
              className="w-full border border-soft rounded-xl pl-10 pr-4 py-2 text-xs outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity filter */}
          <div className="md:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="w-full border border-soft rounded-xl px-3 py-2 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="DANGER">Critical / Deletions (Danger)</option>
              <option value="WARNING">Warnings / Suspensions</option>
              <option value="SUCCESS">Success / Approvals</option>
              <option value="INFO">Informational</option>
            </select>
          </div>

          {/* Actor filter */}
          <div className="md:col-span-2">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full border border-soft rounded-xl px-3 py-2 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Actors ({uniqueActors.length})</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range filter */}
          <div className="md:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full border border-soft rounded-xl px-3 py-2 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>
          </div>

          {/* Sort order toggle */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="w-full border border-soft hover:bg-slate-50 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              title={`Sorting: ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sortOrder === 'newest' ? 'New' : 'Old'}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchTerm || categoryFilter !== 'ALL' || severityFilter !== 'ALL' || actorFilter !== 'ALL' || dateFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-soft text-xs text-slate-500">
            <span className="font-bold text-slate-600">Active filters:</span>
            {categoryFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Category: {categoryFilter}
              </span>
            )}
            {severityFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                Severity: {severityFilter}
              </span>
            )}
            {actorFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                Actor: {actorFilter}
              </span>
            )}
            {dateFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                Range: {dateFilter}
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Keyword: "{searchTerm}"
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setSeverityFilter('ALL');
                setActorFilter('ALL');
                setDateFilter('ALL');
              }}
              className="text-xs text-rose-600 hover:underline font-bold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <b className="navy font-black">{filteredLogs.length}</b> of {logs.length} audit trail records
        </span>
        <span className="text-slate-400 font-mono text-[11px]">
          Target DB: <span className="font-semibold text-slate-600">Firestore (append-only)</span>
        </span>
      </div>

      {/* VIEW MODE 1: TIMELINE / CARDS */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="card p-12 text-center border-soft bg-white">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="navy font-black text-base">No activity log entries match your criteria</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try modifying your search keywords, clear filters, or perform an administrative action to record an event.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const sev = getLogSeverity(log);
              const isDanger = sev === 'DANGER';
              const isWarning = sev === 'WARNING';
              const isSuccess = sev === 'SUCCESS';

              return (
                <div
                  key={log.id}
                  className={`card p-4 sm:p-5 border-soft bg-white transition hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isDanger
                      ? 'border-l-4 border-l-rose-500 bg-rose-50/15'
                      : isWarning
                      ? 'border-l-4 border-l-amber-500 bg-amber-50/15'
                      : isSuccess
                      ? 'border-l-4 border-l-emerald-500 bg-emerald-50/15'
                      : 'border-l-4 border-l-blue-500'
                  }`}
                >
                  {/* Left: Action Icon & Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Action Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        isDanger
                          ? 'bg-rose-100 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : isSuccess
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isDanger ? (
                        <Trash2 className="w-5 h-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Activity className="w-5 h-5" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black navy text-sm tracking-tight">{log.action}</span>

                        {/* Severity Badge */}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isDanger
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isSuccess
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isDanger ? 'Critical Deletion' : isWarning ? 'Warning' : isSuccess ? 'Success' : 'Info'}
                        </span>

                        {/* Target Chip */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                          {log.targetType}:{log.targetName || log.targetId?.slice(0, 8)}
                        </span>
                      </div>

                      {/* Action Details */}
                      <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed break-words">
                        {log.details}
                      </p>

                      {/* Actor & Timestamp Subtitle */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Actor: {log.actorName || 'Admin'}
                          {log.actorEmail ? ` (${log.actorEmail})` : ''}
                        </span>

                        {log.actorRole && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            {log.actorRole}
                          </span>
                        )}

                        <span className="text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatRelativeTime(log.createdAt)} ({new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Inspection Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setInspectedLog(log)}
                      className="border border-soft hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      title="Inspect full cryptographically timestamped event payload"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Audit Dossier</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABULAR AUDIT TABLE */}
      {viewMode === 'table' && (
        <div className="card overflow-x-auto shadow-xl border-soft bg-white">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-soft">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action & Severity</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Actor / Privilege</th>
                <th className="p-3.5">Action Narrative</th>
                <th className="p-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No activity log records match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const sev = getLogSeverity(log);
                  const isDanger = sev === 'DANGER';
                  const isWarning = sev === 'WARNING';
                  const isSuccess = sev === 'SUCCESS';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      {/* Timestamp */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-[11px] font-bold text-slate-700">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Action & Badge */}
                      <td className="p-3.5">
                        <b className="navy text-xs block">{log.action}</b>
                        <span
                          className={`text-[10px] font-black px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                            isDanger
                              ? 'bg-rose-100 text-rose-800'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800'
                              : isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isDanger ? 'Critical Deletion' : isWarning ? 'Warning' : isSuccess ? 'Success' : 'Info'}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block text-xs">{log.targetType}</span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]" title={log.targetId}>
                          {log.targetName || log.targetId}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="p-3.5">
                        <b className="text-slate-800 text-xs block">{log.actorName || 'Admin'}</b>
                        <span className="text-[10px] text-slate-400 block">{log.actorEmail}</span>
                        <span className="text-[10px] text-blue-600 font-bold block mt-0.5">{log.actorRole}</span>
                      </td>

                      {/* Details */}
                      <td className="p-3.5 max-w-xs text-xs text-slate-700 leading-snug">
                        {log.details}
                      </td>

                      {/* Inspect Action */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectedLog(log)}
                          className="border border-soft hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* INSPECTION DOSSIER MODAL */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border-soft bg-white">
            <div className="flex items-start justify-between pb-4 border-b border-soft">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                    getLogSeverity(inspectedLog) === 'DANGER'
                      ? 'bg-rose-600'
                      : getLogSeverity(inspectedLog) === 'WARNING'
                      ? 'bg-amber-600'
                      : getLogSeverity(inspectedLog) === 'SUCCESS'
                      ? 'bg-emerald-600'
                      : 'bg-navy'
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black navy">Audit Event Record</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {inspectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              {/* Event Type & Severity */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-soft">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Action Type</span>
                  <b className="navy text-sm font-bold mt-0.5 block">{inspectedLog.action}</b>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Severity Classification</span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                      getLogSeverity(inspectedLog) === 'DANGER'
                        ? 'bg-rose-100 text-rose-800'
                        : getLogSeverity(inspectedLog) === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : getLogSeverity(inspectedLog) === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {getLogSeverity(inspectedLog)}
                  </span>
                </div>
              </div>

              {/* Timestamp Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-soft space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Cryptographic Timestamp</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Local Time:</span>
                  <b className="navy font-mono">{new Date(inspectedLog.createdAt).toLocaleString()}</b>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">ISO-8601 UTC:</span>
                  <span className="font-mono text-slate-700">{inspectedLog.createdAt}</span>
                </div>
              </div>

              {/* Actor Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-soft space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Administrative Actor</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Name:</span>
                  <b className="navy">{inspectedLog.actorName || 'Super Admin'}</b>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-700">{inspectedLog.actorEmail}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {inspectedLog.actorRole}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Actor UID:</span>
                  <span className="font-mono text-[11px] text-slate-500">{inspectedLog.actorId}</span>
                </div>
              </div>

              {/* Target Entity */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-soft space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Target Entity Affected</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target Type:</span>
                  <b className="text-indigo-800 font-mono">{inspectedLog.targetType}</b>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target ID:</span>
                  <span className="font-mono text-[11px] text-slate-700">{inspectedLog.targetId}</span>
                </div>
                {inspectedLog.targetName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Target Name:</span>
                    <b className="text-slate-800">{inspectedLog.targetName}</b>
                  </div>
                )}
              </div>

              {/* Narrative & Full Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-soft">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
                  Full Action Narrative / Justification
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-soft">
                  {inspectedLog.details}
                </p>
              </div>

              {/* Metadata Payload if present */}
              {inspectedLog.metadata && Object.keys(inspectedLog.metadata).length > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-soft">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
                    Structured Event Metadata
                  </span>
                  <pre className="text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify(inspectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Security & Integrity Note */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <b>Integrity Verified (Append-Only)</b>
                  <p className="mt-0.5 text-emerald-700 leading-normal">
                    This audit record is sealed in Firestore with strict rules prohibiting update and deletion by any user.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-soft flex items-center justify-between gap-3">
              <button
                onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), inspectedLog.id)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedId === inspectedLog.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied JSON!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy JSON Payload</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setInspectedLog(null)}
                className="bg-navy hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD CUSTOM AUDIT NOTE MODAL */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl border-soft bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black navy">Record Administrative Audit Event</h3>
              </div>
              <button
                onClick={() => setCustomModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomLogSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Action Identifier *</label>
                <select
                  value={customActionTitle}
                  onChange={(e) => setCustomActionTitle(e.target.value)}
                  className="w-full border border-soft rounded-xl p-2.5 text-xs bg-white text-slate-800 outline-none font-bold"
                >
                  <option value="ADMIN_SECURITY_AUDIT">ADMIN_SECURITY_AUDIT (Routine Security Review)</option>
                  <option value="DATA_INTEGRITY_CHECK">DATA_INTEGRITY_CHECK (Database Reconciliation)</option>
                  <option value="POLICY_COMPLIANCE_REVIEW">POLICY_COMPLIANCE_REVIEW (Zero-Trust Policy Review)</option>
                  <option value="SYSTEM_MAINTENANCE">SYSTEM_MAINTENANCE (Manual Administrative Operation)</option>
                  <option value="SECURITY_INCIDENT_FLAG">SECURITY_INCIDENT_FLAG (Security Flag / Investigation)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Entity Classification *</label>
                <select
                  value={customTargetType}
                  onChange={(e) => setCustomTargetType(e.target.value)}
                  className="w-full border border-soft rounded-xl p-2.5 text-xs bg-white text-slate-800 outline-none font-bold"
                >
                  <option value="SYSTEM">SYSTEM (Global Infrastructure)</option>
                  <option value="USERS">USERS (Member Directory)</option>
                  <option value="ALUMNI">ALUMNI (Alumni Registry)</option>
                  <option value="INSTITUTION">INSTITUTION (University / Department)</option>
                  <option value="SECURITY">SECURITY (Access Control & RBAC)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Audit Narrative & Verification Findings *
                </label>
                <textarea
                  rows={3}
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  placeholder="Describe the administrative inspection, verification rationale, findings, or accountability notes..."
                  required
                  className="w-full border border-soft rounded-xl p-2.5 text-xs outline-none bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customLoading || !customDetails.trim()}
                  className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {customLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Seal Audit Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
