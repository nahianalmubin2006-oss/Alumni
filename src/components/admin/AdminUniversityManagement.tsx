import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAdmin } from '../../context/AdminContext';
import { UniversityLogo } from '../UniversityLogo';
import { getUniversityLogo, UNIVERSITY_LOGO_MAP } from '../../data/initialData';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { University, Department } from '../../types';
import {
  Building2,
  Image as ImageIcon,
  BookOpen,
  Plus,
  Trash2,
  Edit3,
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
  Shield,
  X,
  Power,
} from 'lucide-react';

interface AdminUniversityManagementProps {
  initialSubTab?: 'universities' | 'departments' | 'add-university' | 'logo';
}

export const AdminUniversityManagement: React.FC<AdminUniversityManagementProps> = ({
  initialSubTab = 'universities',
}) => {
  const {
    universities,
    departments,
    saveUniversity,
    deleteUniversity,
    updateUniversityLogo,
    updateUniversityDepartments,
    saveDepartment,
    deleteDepartment,
  } = useData();

  const { adminUser } = useAdmin();

  // Mode: 'universities' | 'departments' | 'add-university' | 'logo'
  const [activeSubTab, setActiveSubTab] = useState<'universities' | 'departments' | 'add-university' | 'logo'>(
    initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Search filter for universities
  const [searchUni, setSearchUni] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Public' | 'Private' | 'International'>('All');

  // Selected University ID for editing Logo, Departments, or Details
  const [selectedUniId, setSelectedUniId] = useState<string>(() => {
    return universities[0]?.id || 'uni-university-of-dhaka';
  });

  // State for Logo update form
  const [customLogoInput, setCustomLogoInput] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFeedback, setLogoFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // State for Edit University Modal
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [editUniName, setEditUniName] = useState('');
  const [editUniShort, setEditUniShort] = useState('');
  const [editUniType, setEditUniType] = useState<'Public' | 'Private' | 'International'>('Public');
  const [editUniLocation, setEditUniLocation] = useState('');
  const [editUniWebsite, setEditUniWebsite] = useState('');
  const [editUniOverview, setEditUniOverview] = useState('');
  const [editUniStatus, setEditUniStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSavingUniEdit, setIsSavingUniEdit] = useState(false);

  // State for Delete University Modal
  const [deletingUni, setDeletingUni] = useState<University | null>(null);
  const [isDeletingUni, setIsDeletingUni] = useState(false);

  // State for Departments management
  const [searchDept, setSearchDept] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptFaculty, setNewDeptFaculty] = useState('');
  const [newDeptStatus, setNewDeptStatus] = useState<'Active' | 'Inactive'>('Active');
  const [newDeptGroup, setNewDeptGroup] = useState<
    'Engineering' | 'Science' | 'Business' | 'Arts' | 'Law' | 'Health' | 'Agriculture' | 'Social Science' | 'Humanities' | 'Other'
  >('Engineering');
  const [deptFeedback, setDeptFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingDepts, setIsSavingDepts] = useState(false);

  // State for Edit Department Modal
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptFaculty, setEditDeptFaculty] = useState('');
  const [editDeptGroup, setEditDeptGroup] = useState<string>('Engineering');
  const [editDeptStatus, setEditDeptStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSavingDeptEdit, setIsSavingDeptEdit] = useState(false);

  // State for Delete Department Modal
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);

  // State for Add New University form
  const [newUniName, setNewUniName] = useState('');
  const [newUniShort, setNewUniShort] = useState('');
  const [newUniType, setNewUniType] = useState<'Public' | 'Private' | 'International'>('Public');
  const [newUniLocation, setNewUniLocation] = useState('');
  const [newUniWebsite, setNewUniWebsite] = useState('');
  const [newUniStatus, setNewUniStatus] = useState<'Active' | 'Inactive'>('Active');
  const [newUniLogoUrl, setNewUniLogoUrl] = useState('');
  const [newUniLogoFile, setNewUniLogoFile] = useState<File | null>(null);
  const [newUniLogoPreview, setNewUniLogoPreview] = useState('');
  const [newUniOverview, setNewUniOverview] = useState('');
  const [initialDeptsText, setInitialDeptsText] = useState('');
  const [createFeedback, setCreateFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isCreatingUni, setIsCreatingUni] = useState(false);

  // Filtered universities list
  const filteredUniversities = useMemo(() => {
    let list = [...universities];
    if (typeFilter !== 'All') {
      list = list.filter((u) => u.type === typeFilter);
    }
    if (searchUni.trim()) {
      const q = searchUni.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          (u.location && u.location.toLowerCase().includes(q))
      );
    }
    return list;
  }, [universities, searchUni, typeFilter]);

  // Currently active university object
  const activeUni = useMemo(() => {
    return universities.find((u) => u.id === selectedUniId) || universities[0];
  }, [universities, selectedUniId]);

  // Departments belonging to the active university
  const activeUniDepartments = useMemo(() => {
    if (!activeUni) return [];
    let list = departments.filter(
      (d) => d.university.toLowerCase().trim() === activeUni.name.toLowerCase().trim()
    );
    if (searchDept.trim()) {
      const q = searchDept.toLowerCase().trim();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.group.toLowerCase().includes(q));
    }
    return list;
  }, [departments, activeUni, searchDept]);

  // When university changes, reset form previews
  const handleSelectUniversity = (uniId: string) => {
    setSelectedUniId(uniId);
    const uni = universities.find((u) => u.id === uniId);
    if (uni) {
      const currentLogo = uni.logoUrl || getUniversityLogo(uni.name) || '';
      setCustomLogoInput(currentLogo);
      setLogoPreviewUrl(currentLogo);
      setLogoFile(null);
    }
    setLogoFeedback(null);
    setDeptFeedback(null);
  };

  // Handle Logo URL Input Change
  const handleLogoUrlChange = (val: string) => {
    setCustomLogoInput(val);
    setLogoPreviewUrl(val.trim());
    setLogoFile(null);
    setLogoFeedback(null);
  };

  // Handle Local Image Upload (Validation & Preview)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setLogoFeedback({ text: 'Please select a valid image file (PNG, SVG, JPG, WEBP).', type: 'error' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoFeedback({ text: 'Image file is too large (max 2MB).', type: 'error' });
      return;
    }

    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);
    setCustomLogoInput('');
    setLogoFeedback({
      text: `File selected: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready to upload to Firebase Storage.`,
      type: 'success',
    });
  };

  // Submit Logo Update (Firebase Storage + Firestore)
  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUni) return;

    if (!logoFile && !customLogoInput.trim()) {
      setLogoFeedback({ text: 'Please provide a valid logo image URL or select an image to upload.', type: 'error' });
      return;
    }

    setIsSavingLogo(true);
    setLogoFeedback(null);

    let finalLogoUrl = customLogoInput.trim();

    try {
      if (logoFile) {
        // Attempt upload to Firebase Storage
        try {
          const ext = logoFile.name.split('.').pop() || 'png';
          const fileRef = ref(storage, `logos/${encodeURIComponent(activeUni.id)}_${Date.now()}.${ext}`);
          const snap = await uploadBytes(fileRef, logoFile);
          finalLogoUrl = await getDownloadURL(snap.ref);
        } catch (storageErr) {
          console.warn('Firebase Storage upload notice, falling back to persistent data URL:', storageErr);
          // Fallback to FileReader data URL to guarantee persistent storage
          finalLogoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoFile);
          });
        }
      }

      await updateUniversityLogo(activeUni.id, finalLogoUrl);

      setLogoFeedback({
        text: `Official emblem for "${activeUni.name}" updated successfully! Changes are live across all public profiles.`,
        type: 'success',
      });
      setLogoFile(null);
      setCustomLogoInput(finalLogoUrl);
      setLogoPreviewUrl(finalLogoUrl);
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
      setLogoFile(null);
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

  // Start Edit University
  const handleOpenEditUni = (uni: University) => {
    setEditingUni(uni);
    setEditUniName(uni.name);
    setEditUniShort(uni.shortName || uni.code || '');
    setEditUniType(uni.type);
    setEditUniLocation(uni.location || '');
    setEditUniWebsite(uni.website || '');
    setEditUniOverview(uni.overview || '');
    setEditUniStatus(uni.status || 'Active');
  };

  // Save Edit University
  const handleSaveUniEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUni) return;

    setIsSavingUniEdit(true);
    try {
      const updated: Partial<University> = {
        id: editingUni.id,
        name: editUniName.trim(),
        shortName: editUniShort.trim(),
        code: editUniShort.trim(),
        type: editUniType,
        location: editUniLocation.trim(),
        website: editUniWebsite.trim(),
        overview: editUniOverview.trim(),
        status: editUniStatus,
      };

      await saveUniversity(updated);

      // Also notify backend server
      try {
        await fetch(`/api/admin/universities/${encodeURIComponent(editingUni.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (e) {}

      setEditingUni(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update university details.');
    } finally {
      setIsSavingUniEdit(false);
    }
  };

  // Confirm Delete University
  const handleConfirmDeleteUni = async () => {
    if (!deletingUni) return;
    setIsDeletingUni(true);
    try {
      await deleteUniversity(deletingUni.id);
      setDeletingUni(null);
      if (selectedUniId === deletingUni.id && universities.length > 1) {
        setSelectedUniId(universities[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete university.');
    } finally {
      setIsDeletingUni(false);
    }
  };

  // Toggle university active/inactive status safely
  const handleToggleUniStatus = async (uni: University) => {
    const newStatus = uni.status === 'Inactive' ? 'Active' : 'Inactive';
    try {
      await saveUniversity({
        id: uni.id,
        name: uni.name,
        status: newStatus,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
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

    const alreadyExists = departments.some(
      (d) =>
        d.university.toLowerCase().trim() === activeUni.name.toLowerCase().trim() &&
        d.name.toLowerCase().trim() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setDeptFeedback({
        text: `Department "${trimmed}" already exists under ${activeUni.name}. Duplicates are prohibited.`,
        type: 'error',
      });
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
        faculty: newDeptFaculty.trim() || newDeptGroup,
        group: newDeptGroup,
        status: newDeptStatus,
        verified: true,
        alumniCount: 0,
        studentCount: 0,
        employmentRate: 0,
        higherStudiesRate: 0,
        countriesCount: 0,
        companiesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update university department count
      const actualCount = departments.filter(
        (d) => d.university.toLowerCase() === activeUni.name.toLowerCase() && d.status !== 'Inactive'
      ).length + 1;

      await saveUniversity({
        id: activeUni.id,
        name: activeUni.name,
        departmentCount: actualCount,
      });

      setNewDeptName('');
      setNewDeptFaculty('');
      setNewDeptStatus('Active');
      setDeptFeedback({
        text: `Department "${trimmed}" added successfully to ${activeUni.name}! It is live across the public directory.`,
        type: 'success',
      });
    } catch (err: any) {
      setDeptFeedback({ text: err.message || 'Failed to add department.', type: 'error' });
    } finally {
      setIsSavingDepts(false);
    }
  };

  // Open Edit Department
  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditDeptFaculty(dept.faculty || dept.group || 'General');
    setEditDeptGroup(dept.group || 'Engineering');
    setEditDeptStatus(dept.status || 'Active');
  };

  // Save Edit Department
  const handleSaveDeptEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !activeUni) return;

    const trimmed = editDeptName.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() !== editingDept.name.toLowerCase()) {
      const duplicate = departments.some(
        (d) =>
          d.id !== editingDept.id &&
          d.university.toLowerCase().trim() === activeUni.name.toLowerCase().trim() &&
          d.name.toLowerCase().trim() === trimmed.toLowerCase()
      );
      if (duplicate) {
        alert(`A department named "${trimmed}" already exists under ${activeUni.name}. Duplicates are prohibited.`);
        return;
      }
    }

    setIsSavingDeptEdit(true);
    try {
      await saveDepartment({
        id: editingDept.id,
        name: trimmed,
        faculty: editDeptFaculty.trim() || editDeptGroup,
        group: editDeptGroup as any,
        status: editDeptStatus,
        university: activeUni.name,
        verified: true,
        updatedAt: new Date().toISOString(),
      });
      setEditingDept(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update department.');
    } finally {
      setIsSavingDeptEdit(false);
    }
  };

  // Confirm Delete Department
  const handleConfirmDeleteDept = async () => {
    if (!deletingDept || !activeUni) return;

    try {
      await deleteDepartment(deletingDept.id);
      await saveUniversity({
        id: activeUni.id,
        name: activeUni.name,
        departmentCount: Math.max(0, activeUniDepartments.length - 1),
      });
      setDeletingDept(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete department.');
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

      let finalLogo = newUniLogoUrl.trim();

      if (newUniLogoFile) {
        try {
          const ext = newUniLogoFile.name.split('.').pop() || 'png';
          const fileRef = ref(storage, `logos/${encodeURIComponent(uniId)}_${Date.now()}.${ext}`);
          const snap = await uploadBytes(fileRef, newUniLogoFile);
          finalLogo = await getDownloadURL(snap.ref);
        } catch (e) {
          finalLogo = newUniLogoPreview;
        }
      }

      // 1. Create the university with 0 for all statistics as requested
      await saveUniversity({
        id: uniId,
        name: trimmedName,
        shortName: newUniShort.trim(),
        code: newUniShort.trim(),
        type: newUniType,
        location: newUniLocation.trim() || 'Bangladesh',
        website: newUniWebsite.trim(),
        logoUrl: finalLogo,
        status: newUniStatus,
        overview: newUniOverview.trim(),
        alumniCount: 0,
        studentCount: 0,
        followersCount: 0,
        departmentCount: parsedDepts.length,
        employmentRate: 0,
        higherStudiesRate: 0,
        countriesCount: 0,
        companiesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Set custom logo if provided
      if (finalLogo) {
        await updateUniversityLogo(uniId, finalLogo);
      }

      // 3. Create initial departments with verified: true
      if (parsedDepts.length > 0) {
        for (const deptName of parsedDepts) {
          const dId = 'dept-' + encodeURIComponent((trimmedName + '-' + deptName).toLowerCase().replace(/[^a-z0-9]/g, '-'));
          await saveDepartment({
            id: dId,
            name: deptName,
            university: trimmedName,
            group: 'Engineering',
            status: 'Active',
            verified: false,
            alumniCount: 0,
            studentCount: 0,
            employmentRate: 0,
            higherStudiesRate: 0,
            countriesCount: 0,
            companiesCount: 0,
          });
        }
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
            logoUrl: finalLogo,
            website: newUniWebsite.trim(),
            status: newUniStatus,
            departments: parsedDepts,
            description: newUniOverview.trim(),
          }),
        });
      } catch (e) {}

      setCreateFeedback({
        text: `University "${trimmedName}" created and registered successfully with ${parsedDepts.length} departments! It is now live in the public directory.`,
        type: 'success',
      });

      setSelectedUniId(uniId);
      setNewUniName('');
      setNewUniShort('');
      setNewUniLocation('');
      setNewUniWebsite('');
      setNewUniLogoUrl('');
      setNewUniLogoFile(null);
      setNewUniLogoPreview('');
      setNewUniOverview('');
      setNewUniStatus('Active');
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
              Manually manage universities, upload official emblems to Firebase Storage, configure department catalogues, and maintain real database records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Live Database</div>
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
            onClick={() => setActiveSubTab('universities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              activeSubTab === 'universities'
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Universities ({universities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('departments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              activeSubTab === 'departments'
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Department Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              activeSubTab === 'logo'
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Logo Uploader & Emblem Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('add-university')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
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

      {/* ============================================================== */}
      {/* SUB-TAB: UNIVERSITIES LIST & MANAGEMENT */}
      {/* ============================================================== */}
      {activeSubTab === 'universities' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white">University Directory Management</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit profiles, manage official insignia, and configure institutional parameters.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchUni}
                  onChange={(e) => setSearchUni(e.target.value)}
                  placeholder="Filter universities..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-800/90 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
                <option value="International">International</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUniversities.map((uni) => {
              const deptCount = departments.filter(
                (d) => d.university.toLowerCase().trim() === uni.name.toLowerCase().trim()
              ).length;

              return (
                <div
                  key={uni.id}
                  className="bg-slate-800/50 border border-slate-700/70 hover:border-blue-500/50 rounded-2xl p-4 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <UniversityLogo name={uni.name} logoUrl={uni.logoUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                            {uni.type}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-1 group-hover:text-blue-300 transition" title={uni.name}>
                          {uni.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{uni.location || 'Bangladesh'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-center">
                      <div className="bg-slate-900/40 rounded-xl p-1.5">
                        <span className="text-[10px] text-slate-500 block">Depts</span>
                        <b className="text-xs text-white">{deptCount}</b>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-1.5">
                        <span className="text-[10px] text-slate-500 block">Alumni</span>
                        <b className="text-xs text-emerald-400">{uni.alumniCount || 0}</b>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-1.5">
                        <span className="text-[10px] text-slate-500 block">Students</span>
                        <b className="text-xs text-blue-400">{uni.studentCount || 0}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => handleOpenEditUni(uni)}
                      className="flex-1 bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectUniversity(uni.id);
                        setActiveSubTab('logo');
                      }}
                      className="p-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="Update Emblem"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectUniversity(uni.id);
                        setActiveSubTab('departments');
                      }}
                      className="p-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="Manage Departments"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingUni(uni)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition cursor-pointer"
                      title="Delete University"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB: UPDATE UNIVERSITY LOGO */}
      {/* ============================================================== */}
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
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 group cursor-pointer ${
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

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Emblem Preview & Live Test
                  </label>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-around gap-6">
                    <div className="text-center">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Current Live Logo
                      </div>
                      <div className="flex justify-center">
                        <UniversityLogo name={activeUni.name} logoUrl={activeUni.logoUrl} size="xl" />
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-24 bg-slate-800" />

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
                                  text: 'The provided image URL could not be loaded. Please check the URL or upload a file.',
                                  type: 'error',
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                            <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                            <span>No logo selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Local File to Firebase Storage Option */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Upload New Emblem File (Firebase Storage)
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-750 border border-dashed border-slate-600 rounded-xl p-3 text-xs text-slate-300 cursor-pointer transition hover:text-white hover:border-blue-400">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>
                      {logoFile ? `Selected: ${logoFile.name}` : 'Choose PNG, SVG, JPG, WEBP file (Max 2MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Or enter Direct URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Or Enter Direct Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={customLogoInput}
                    onChange={(e) => handleLogoUrlChange(e.target.value)}
                    placeholder="https://upload.wikimedia.org/... or /logos/custom.svg"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Paste any official university emblem URL or upload above.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={isSavingLogo}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingLogo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Uploading & Updating Emblem...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save & Apply Logo in Firestore</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultLogo}
                    disabled={isSavingLogo}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl transition border border-slate-700 flex items-center gap-2 cursor-pointer"
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

      {/* ============================================================== */}
      {/* SUB-TAB: DEPARTMENT MANAGEMENT */}
      {/* ============================================================== */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* University Selector Column */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[650px]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Select Institution</span>
            </h3>

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

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredUniversities.map((uni) => {
                const isSelected = uni.id === activeUni?.id;
                const count = departments.filter(
                  (d) => d.university.toLowerCase().trim() === uni.name.toLowerCase().trim()
                ).length;

                return (
                  <button
                    key={uni.id}
                    onClick={() => handleSelectUniversity(uni.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/60 ring-1 ring-blue-500/40 text-white'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <UniversityLogo name={uni.name} logoUrl={uni.logoUrl} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{uni.name}</div>
                      <div className="text-[10px] text-slate-400">{count} departments</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Management Panel Column */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col h-[650px]">
            {activeUni ? (
              <div className="flex flex-col h-full space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <UniversityLogo name={activeUni.name} logoUrl={activeUni.logoUrl} size="sm" />
                    <div>
                      <h3 className="text-base font-black text-white">{activeUni.name}</h3>
                      <p className="text-xs text-slate-400">
                        Managing {activeUniDepartments.length} registered departments
                      </p>
                    </div>
                  </div>
                </div>

                {deptFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      deptFeedback.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {deptFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{deptFeedback.text}</span>
                  </div>
                )}

                {/* Add Department Inline Form */}
                <form onSubmit={handleAddDepartment} className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="New Department Name (e.g. Software Engineering)"
                    required
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />

                  <select
                    value={newDeptGroup}
                    onChange={(e) => setNewDeptGroup(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Science">Science</option>
                    <option value="Business">Business</option>
                    <option value="Arts">Arts</option>
                    <option value="Law">Law</option>
                    <option value="Health">Health</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Other">Other</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isSavingDepts}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to University</span>
                  </button>
                </form>

                {/* Filter departments */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchDept}
                    onChange={(e) => setSearchDept(e.target.value)}
                    placeholder="Filter departments in this university..."
                    className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Departments List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {activeUniDepartments.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No departments found matching search. Use the form above to add a department.
                    </div>
                  ) : (
                    activeUniDepartments.map((dept) => (
                      <div
                        key={dept.id}
                        className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-600 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{dept.name}</span>
                            {dept.verified ? (
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded-md font-bold shrink-0">
                                Verified Curriculum
                              </span>
                            ) : (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-md font-bold shrink-0">
                                Admin Created
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Faculty: {dept.group || 'General'}</span>
                            {dept.sourceUrl && (
                              <a
                                href={dept.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDept(dept)}
                            className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                            title="Edit / Rename Department"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingDept(dept)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Remove Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">Select a university to manage its departments.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB: ADD NEW UNIVERSITY FORM */}
      {/* ============================================================== */}
      {activeSubTab === 'add-university' && (
        <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="border-b border-slate-800 pb-5 mb-6">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              Manual Institution Registration
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              Add New University to Platform
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Registers an authentic university into the directory. All initial metrics (alumni, students, employment) begin at 0 and update automatically from real user submissions.
            </p>
          </div>

          {createFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 mb-6 ${
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

          <form onSubmit={handleCreateUniversity} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  University Full Name *
                </label>
                <input
                  type="text"
                  value={newUniName}
                  onChange={(e) => setNewUniName(e.target.value)}
                  placeholder="e.g. Bangladesh Army University of Science and Technology"
                  required
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Short Name / Acronym
                </label>
                <input
                  type="text"
                  value={newUniShort}
                  onChange={(e) => setNewUniShort(e.target.value)}
                  placeholder="e.g. BAUST"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institution Type *
                </label>
                <select
                  value={newUniType}
                  onChange={(e) => setNewUniType(e.target.value as any)}
                  className="w-full bg-slate-800/90 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Public">Public University</option>
                  <option value="Private">Private University</option>
                  <option value="International">International University</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Campus Location
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

            {/* Emblem Option */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Official Logo / Emblem
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full space-y-2">
                  <label className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-750 border border-dashed border-slate-600 rounded-xl p-3 text-xs text-slate-300 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{newUniLogoFile ? newUniLogoFile.name : 'Choose Logo File (PNG, SVG, JPG - Max 2MB)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewUniLogoFile(file);
                          setNewUniLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="url"
                    value={newUniLogoUrl}
                    onChange={(e) => {
                      setNewUniLogoUrl(e.target.value);
                      setNewUniLogoPreview(e.target.value);
                      setNewUniLogoFile(null);
                    }}
                    placeholder="Or enter direct logo URL: https://example.com/logo.png"
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {newUniLogoPreview && (
                  <div className="w-16 h-16 rounded-xl bg-white p-1.5 border border-slate-600 flex items-center justify-center shrink-0">
                    <img src={newUniLogoPreview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
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
                Enter each department on a new line. These will be automatically created and linked to this university.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Overview / Mission
              </label>
              <textarea
                rows={2}
                value={newUniOverview}
                onChange={(e) => setNewUniOverview(e.target.value)}
                placeholder="Leading institution established to foster academic research and student excellence..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isCreatingUni}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCreatingUni ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering University...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Register & Publish University in Directory</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT UNIVERSITY MODAL */}
      {/* ============================================================== */}
      {editingUni && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Edit University Details</h3>
              <button
                onClick={() => setEditingUni(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUniEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">University Name</label>
                <input
                  type="text"
                  value={editUniName}
                  onChange={(e) => setEditUniName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Type</label>
                  <select
                    value={editUniType}
                    onChange={(e) => setEditUniType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                    <option value="International">International</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    value={editUniLocation}
                    onChange={(e) => setEditUniLocation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Official Website</label>
                <input
                  type="url"
                  value={editUniWebsite}
                  onChange={(e) => setEditUniWebsite(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Overview / Description</label>
                <textarea
                  rows={3}
                  value={editUniOverview}
                  onChange={(e) => setEditUniOverview(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUni(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUniEdit}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  {isSavingUniEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE UNIVERSITY CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {deletingUni && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-white text-center">Confirm University Removal</h3>
            <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
              Are you sure you want to delete <b className="text-white">"{deletingUni.name}"</b>? This will safely remove the institution record from the public directory.
            </p>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingUni(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUni}
                disabled={isDeletingUni}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                {isDeletingUni ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT DEPARTMENT MODAL */}
      {/* ============================================================== */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Rename / Edit Department</h3>
              <button onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeptEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Department Name *</label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Faculty / Group</label>
                <select
                  value={editDeptGroup}
                  onChange={(e) => setEditDeptGroup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Science">Science</option>
                  <option value="Business">Business</option>
                  <option value="Arts">Arts</option>
                  <option value="Law">Law</option>
                  <option value="Health">Health</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Humanities">Humanities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeptEdit}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {isSavingDeptEdit ? 'Saving...' : 'Update Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE DEPARTMENT MODAL */}
      {/* ============================================================== */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-black text-white text-center">Remove Department</h3>
            <p className="text-xs text-slate-400 text-center mt-2">
              Are you sure you want to remove <b className="text-white">"{deletingDept.name}"</b> from {activeUni?.name}?
            </p>

            <div className="flex items-center gap-3 mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="flex-1 bg-slate-800 text-slate-300 font-bold text-xs py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDept}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
