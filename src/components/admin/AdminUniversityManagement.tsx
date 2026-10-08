import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAdmin } from '../../context/AdminContext';
import { UniversityLogo } from '../UniversityLogo';
import { getUniversityLogo, UNIVERSITY_LOGO_MAP } from '../../data/initialData';
import {
  Building2,
  Image as ImageIcon,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Upload,
  ExternalLink,
  Sparkles,
  Save,
  RotateCcw,
  Globe,
  MapPin,
  GraduationCap,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

export const AdminUniversityManagement: React.FC = () => {
  const {
    universities,
    departments,
    saveUniversity,
    updateUniversityLogo,
    updateUniversityDepartments,
    saveDepartment,
    deleteDepartment,
  } = useData();

  const { adminUser } = useAdmin();

  // Mode: 'logo' | 'departments' | 'add-university'
  const [activeSubTab, setActiveSubTab] = useState<'logo' | 'departments' | 'add-university'>('logo');

  // Search filter for universities selector
  const [searchUni, setSearchUni] = useState('');

  // Selected University ID for editing Logo or Departments
  const [selectedUniId, setSelectedUniId] = useState<string>(() => {
    return universities[0]?.id || 'uni-university-of-dhaka';
  });

  // State for Logo update form
  const [customLogoInput, setCustomLogoInput] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [logoFeedback, setLogoFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // State for Departments management
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptGroup, setNewDeptGroup] = useState<
    'Engineering' | 'Science' | 'Business' | 'Arts' | 'Law' | 'Health' | 'Agriculture'
  >('Engineering');
  const [deptFeedback, setDeptFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingDepts, setIsSavingDepts] = useState(false);

  // State for Add New University form
  const [newUniName, setNewUniName] = useState('');
  const [newUniShort, setNewUniShort] = useState('');
  const [newUniType, setNewUniType] = useState<'Public' | 'Private' | 'International'>('Public');
  const [newUniLocation, setNewUniLocation] = useState('');
  const [newUniWebsite, setNewUniWebsite] = useState('');
  const [newUniLogoUrl, setNewUniLogoUrl] = useState('');
  const [newUniOverview, setNewUniOverview] = useState('');
  const [initialDeptsText, setInitialDeptsText] = useState(
    'Computer Science & Engineering\nElectrical & Electronic Engineering\nBusiness Administration'
  );
  const [createFeedback, setCreateFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isCreatingUni, setIsCreatingUni] = useState(false);

  // Filtered universities list
  const filteredUniversities = useMemo(() => {
    if (!searchUni.trim()) return universities;
    const q = searchUni.toLowerCase().trim();
    return universities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.location && u.location.toLowerCase().includes(q))
    );
  }, [universities, searchUni]);

  // Currently active university object
  const activeUni = useMemo(() => {
    return universities.find((u) => u.id === selectedUniId) || universities[0];
  }, [universities, selectedUniId]);

  // Departments belonging to the active university
  const activeUniDepartments = useMemo(() => {
    if (!activeUni) return [];
    return departments.filter(
      (d) => d.university.toLowerCase().trim() === activeUni.name.toLowerCase().trim()
    );
  }, [departments, activeUni]);

  // When university changes, reset form previews
  const handleSelectUniversity = (uniId: string) => {
    setSelectedUniId(uniId);
    const uni = universities.find((u) => u.id === uniId);
    if (uni) {
      const currentLogo = uni.logoUrl || getUniversityLogo(uni.name) || '';
      setCustomLogoInput(currentLogo);
      setLogoPreviewUrl(currentLogo);
    }
    setLogoFeedback(null);
    setDeptFeedback(null);
  };

  // Handle Logo URL Input Change
  const handleLogoUrlChange = (val: string) => {
    setCustomLogoInput(val);
    setLogoPreviewUrl(val.trim());
    setLogoFeedback(null);
  };

  // Handle Local Image Upload (Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoFeedback({ text: 'Please select a valid image file (PNG, SVG, JPG, WEBP).', type: 'error' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoFeedback({ text: 'Image file is too large (max 2MB).', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomLogoInput(dataUrl);
        setLogoPreviewUrl(dataUrl);
        setLogoFeedback({ text: 'Image loaded from your device. Click Save Logo below to apply.', type: 'success' });
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Logo Update
  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUni) return;

    if (!customLogoInput.trim()) {
      setLogoFeedback({ text: 'Please provide a valid logo image URL or upload an image.', type: 'error' });
      return;
    }

    setIsSavingLogo(true);
    setLogoFeedback(null);

    try {
      await updateUniversityLogo(activeUni.id, customLogoInput.trim());
      setLogoFeedback({
        text: `Official emblem for "${activeUni.name}" updated successfully! Changes are live across all profiles.`,
        type: 'success',
      });
    } catch (err: any) {
      setLogoFeedback({
        text: err.message || 'Failed to update university logo. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Reset to default emblem
  const handleResetDefaultLogo = async () => {
    if (!activeUni) return;
    const defaultLogo = UNIVERSITY_LOGO_MAP[activeUni.name] || '';
    setIsSavingLogo(true);
    try {
      await updateUniversityLogo(activeUni.id, defaultLogo);
      setCustomLogoInput(defaultLogo);
      setLogoPreviewUrl(defaultLogo);
      setLogoFeedback({
        text: `Emblem for "${activeUni.name}" reset to system default.`,
        type: 'success',
      });
    } catch (err: any) {
      setLogoFeedback({ text: err.message || 'Failed to reset emblem.', type: 'error' });
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Add Department to University
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUni) return;

    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setDeptFeedback({ text: 'Department name is required.', type: 'error' });
      return;
    }

    const alreadyExists = activeUniDepartments.some(
      (d) => d.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setDeptFeedback({ text: `Department "${trimmed}" already exists under ${activeUni.name}.`, type: 'error' });
      return;
    }

    setIsSavingDepts(true);
    setDeptFeedback(null);

    try {
      const deptId = 'dept-' + encodeURIComponent((activeUni.name + '-' + trimmed).toLowerCase().replace(/[^a-z0-9]/g, '-'));
      await saveDepartment({
        id: deptId,
        name: trimmed,
        university: activeUni.name,
        group: newDeptGroup,
        alumniCount: 0,
        studentCount: 0,
        employmentRate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Also ensure university department count updates
      await saveUniversity({
        id: activeUni.id,
        name: activeUni.name,
        departmentCount: activeUniDepartments.length + 1,
      });

      setNewDeptName('');
      setDeptFeedback({
        text: `Department "${trimmed}" added successfully to ${activeUni.name}!`,
        type: 'success',
      });
    } catch (err: any) {
      setDeptFeedback({ text: err.message || 'Failed to add department.', type: 'error' });
    } finally {
      setIsSavingDepts(false);
    }
  };

  // Remove Department
  const handleRemoveDepartment = async (deptId: string, deptName: string) => {
    if (!activeUni) return;
    if (!window.confirm(`Are you sure you want to remove "${deptName}" from ${activeUni.name}?`)) {
      return;
    }

    setIsSavingDepts(true);
    try {
      await deleteDepartment(deptId);
      setDeptFeedback({
        text: `Department "${deptName}" removed from ${activeUni.name}.`,
        type: 'success',
      });
    } catch (err: any) {
      setDeptFeedback({ text: err.message || 'Failed to remove department.', type: 'error' });
    } finally {
      setIsSavingDepts(false);
    }
  };

  // Handle Add New University
  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newUniName.trim();

    if (!trimmedName) {
      setCreateFeedback({ text: 'University full name is required.', type: 'error' });
      return;
    }

    const alreadyExists = universities.some(
      (u) => u.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyExists) {
      setCreateFeedback({ text: `A university with name "${trimmedName}" already exists.`, type: 'error' });
      return;
    }

    setIsCreatingUni(true);
    setCreateFeedback(null);

    try {
      const uniId = 'uni-' + encodeURIComponent(trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      const parsedDepts = initialDeptsText
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean);

      // 1. Create the university
      await saveUniversity({
        id: uniId,
        name: trimmedName,
        type: newUniType,
        location: newUniLocation.trim() || 'Bangladesh',
        website: newUniWebsite.trim(),
        logoUrl: newUniLogoUrl.trim(),
        overview: newUniOverview.trim(),
        alumniCount: 0,
        studentCount: 0,
        departmentCount: parsedDepts.length,
        employmentRate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Set custom logo if provided
      if (newUniLogoUrl.trim()) {
        await updateUniversityLogo(uniId, newUniLogoUrl.trim());
      }

      // 3. Create initial departments
      if (parsedDepts.length > 0) {
        await updateUniversityDepartments(trimmedName, parsedDepts);
      }

      // 4. Also register on backend server API
      try {
        await fetch('/api/admin/universities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            shortName: newUniShort.trim(),
            type: newUniType,
            location: newUniLocation.trim(),
            logoUrl: newUniLogoUrl.trim(),
            website: newUniWebsite.trim(),
            departments: parsedDepts,
            description: newUniOverview.trim(),
          }),
        });
      } catch (e) {}

      setCreateFeedback({
        text: `University "${trimmedName}" created and registered successfully with ${parsedDepts.length} departments!`,
        type: 'success',
      });

      // Select newly created university
      setSelectedUniId(uniId);

      // Reset form
      setNewUniName('');
      setNewUniShort('');
      setNewUniLocation('');
      setNewUniWebsite('');
      setNewUniLogoUrl('');
      setNewUniOverview('');
    } catch (err: any) {
      setCreateFeedback({ text: err.message || 'Failed to create university.', type: 'error' });
    } finally {
      setIsCreatingUni(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest mb-1.5">
              <Building2 className="w-4 h-4" />
              <span>Higher Education Institution Management</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Universities & Department Director
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Manually manage official university logos, configure department catalogues, and register new higher education institutions across Bangladesh.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Catalogue Stats</div>
              <div className="text-sm font-black text-white">
                {universities.length} Universities · {departments.length} Departments
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('logo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
              activeSubTab === 'logo'
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Update University Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('departments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
              activeSubTab === 'departments'
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Update Department List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('add-university')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
              activeSubTab === 'add-university'
                ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add New University</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: UPDATE UNIVERSITY LOGO */}
      {activeSubTab === 'logo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* University Picker Column */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[650px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span>Select University ({filteredUniversities.length})</span>
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchUni}
                onChange={(e) => setSearchUni(e.target.value)}
                placeholder="Search university name, city..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Universities Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredUniversities.map((uni) => {
                const isSelected = uni.id === activeUni?.id;
                return (
                  <button
                    key={uni.id}
                    onClick={() => handleSelectUniversity(uni.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 group ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/60 ring-1 ring-blue-500/40 text-white'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <UniversityLogo name={uni.name} logoUrl={uni.logoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate group-hover:text-blue-300 transition">
                        {uni.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-300">{uni.type}</span>
                        {uni.location && <span>• {uni.location}</span>}
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logo Editor Form Column */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            {activeUni ? (
              <form onSubmit={handleSaveLogo} className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <UniversityLogo name={activeUni.name} logoUrl={activeUni.logoUrl} size="md" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        {activeUni.type} Institution
                      </span>
                      <h3 className="text-lg font-black text-white mt-1 leading-snug">
                        {activeUni.name}
                      </h3>
                      <p className="text-xs text-slate-400">{activeUni.location || 'Bangladesh'}</p>
                    </div>
                  </div>
                </div>

                {/* Feedback Toast */}
                {logoFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      logoFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {logoFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{logoFeedback.text}</span>
                  </div>
                )}

                {/* Live Logo Preview Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Emblem Preview & Live Test
                  </label>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-around gap-6">
                    {/* Current Display */}
                    <div className="text-center">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Current Live Logo
                      </div>
                      <div className="flex justify-center">
                        <UniversityLogo name={activeUni.name} logoUrl={activeUni.logoUrl} size="xl" />
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-24 bg-slate-800" />

                    {/* Pending Preview */}
                    <div className="text-center">
                      <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                        New Logo Preview
                      </div>
                      <div className="flex justify-center">
                        {logoPreviewUrl ? (
                          <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-blue-500/50 shadow-lg shadow-blue-500/10 flex items-center justify-center overflow-hidden">
                            <img
                              src={logoPreviewUrl}
                              alt="New logo preview"
                              className="w-full h-full object-contain"
                              onError={() =>
                                setLogoFeedback({
                                  text: 'The provided image URL could not be loaded. Please check the URL.',
                                  type: 'error',
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                            <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                            <span>No URL entered</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input for Logo URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Logo Image URL (Direct Link, SVG, PNG)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={customLogoInput}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      placeholder="https://example.com/logo.png or /logos/custom.svg"
                      required
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Paste any authentic university emblem URL from Wikipedia Commons, official portals, or CDN.
                  </p>
                </div>

                {/* Upload Local File Option */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Or Upload File from Device
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-750 border border-dashed border-slate-600 rounded-xl p-3 text-xs text-slate-300 cursor-pointer transition hover:text-white hover:border-blue-400">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Choose PNG, SVG, or JPG image file (Max 2MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={isSavingLogo}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                  >
                    {isSavingLogo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Emblem...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save & Apply University Logo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultLogo}
                    disabled={isSavingLogo}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl transition border border-slate-700 flex items-center gap-2"
                    title="Reset to system default insignia"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Default</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-500">
                Please select a university from the list to view and update its logo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: UPDATE DEPARTMENT LIST */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* University Picker Column */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[650px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span>Select University ({filteredUniversities.length})</span>
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchUni}
                onChange={(e) => setSearchUni(e.target.value)}
                placeholder="Search university..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredUniversities.map((uni) => {
                const isSelected = uni.id === activeUni?.id;
                const deptCount = departments.filter(
                  (d) => d.university.toLowerCase() === uni.name.toLowerCase()
                ).length;

                return (
                  <button
                    key={uni.id}
                    onClick={() => handleSelectUniversity(uni.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 group ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/60 ring-1 ring-blue-500/40 text-white'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <UniversityLogo name={uni.name} logoUrl={uni.logoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate group-hover:text-blue-300 transition">
                        {uni.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-blue-400">{deptCount} departments</span>
                        <span>• {uni.type}</span>
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departments Catalogue Manager */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
            {activeUni ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <UniversityLogo name={activeUni.name} logoUrl={activeUni.logoUrl} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {activeUniDepartments.length} Active Departments
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1 leading-snug">
                        {activeUni.name}
                      </h3>
                      <p className="text-xs text-slate-400">Manage academic faculties and degree departments</p>
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                {deptFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      deptFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {deptFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{deptFeedback.text}</span>
                  </div>
                )}

                {/* Add New Department Form */}
                <form
                  onSubmit={handleAddDepartment}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" />
                    <span>Add New Department to {activeUni.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="e.g. Artificial Intelligence & Data Science"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={newDeptGroup}
                        onChange={(e: any) => setNewDeptGroup(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Science">Science</option>
                        <option value="Business">Business</option>
                        <option value="Arts">Arts</option>
                        <option value="Law">Law</option>
                        <option value="Health">Health / Medical</option>
                        <option value="Agriculture">Agriculture</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingDepts}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs py-2 px-5 rounded-xl transition shadow flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Department</span>
                  </button>
                </form>

                {/* Existing Departments List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Current Department List ({activeUniDepartments.length})
                    </label>
                  </div>

                  {activeUniDepartments.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                      No departments currently recorded for this university. Use the form above to add departments.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {activeUniDepartments.map((dept) => (
                        <div
                          key={dept.id}
                          className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 group hover:border-slate-600 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {dept.name}
                              </div>
                              <span className="text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700/60">
                                {dept.group || 'Academic'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDepartment(dept.id, dept.name)}
                            disabled={isSavingDepts}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                            title={`Remove ${dept.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ADD NEW UNIVERSITY */}
      {activeSubTab === 'add-university' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Add New University Manually
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Register a newly recognized higher education institution into AlumniSphere's nationwide directory.
              </p>
            </div>
          </div>

          {/* Feedback */}
          {createFeedback && (
            <div
              className={`mt-6 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                createFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {createFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{createFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateUniversity} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-8">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  University Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newUniName}
                  onChange={(e) => setNewUniName(e.target.value)}
                  placeholder="e.g. Bangladesh Army University of Science & Technology"
                  required
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Acronym / Short */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Short Acronym
                </label>
                <input
                  type="text"
                  value={newUniShort}
                  onChange={(e) => setNewUniShort(e.target.value)}
                  placeholder="e.g. BAUST"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              {/* Institution Type */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institution Type
                </label>
                <select
                  value={newUniType}
                  onChange={(e: any) => setNewUniType(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Public">Public University</option>
                  <option value="Private">Private University</option>
                  <option value="International">International Institution</option>
                </select>
              </div>

              {/* Location */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Campus Location / City
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={newUniLocation}
                    onChange={(e) => setNewUniLocation(e.target.value)}
                    placeholder="e.g. Saidpur, Nilphamari"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Official Website */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Website
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={newUniWebsite}
                    onChange={(e) => setNewUniWebsite(e.target.value)}
                    placeholder="https://baust.edu.bd"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Logo Image URL */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Logo URL
              </label>
              <div className="relative">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={newUniLogoUrl}
                  onChange={(e) => setNewUniLogoUrl(e.target.value)}
                  placeholder="https://upload.wikimedia.org/... or /logos/example.svg"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Initial Departments */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Initial Department List (One per line)
              </label>
              <textarea
                rows={4}
                value={initialDeptsText}
                onChange={(e) => setInitialDeptsText(e.target.value)}
                placeholder="Computer Science & Engineering&#10;Electrical & Electronic Engineering&#10;Business Administration"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter each department on a new line. These will be immediately created and linked to this university.
              </p>
            </div>

            {/* Description / Overview */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Overview / Mission
              </label>
              <textarea
                rows={2}
                value={newUniOverview}
                onChange={(e) => setNewUniOverview(e.target.value)}
                placeholder="Leading technological university established to foster academic excellence..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isCreatingUni}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isCreatingUni ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering University...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Register & Publish University</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
