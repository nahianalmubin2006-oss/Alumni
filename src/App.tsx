import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Public User Views
import { HomeView } from './views/HomeView';
import { UniversitiesView } from './views/UniversitiesView';
import { UniversityDetailView } from './views/UniversityDetailView';
import { DepartmentsView } from './views/DepartmentsView';
import { DepartmentUniversitiesView } from './views/DepartmentUniversitiesView';
import { DepartmentProfileView } from './views/DepartmentProfileView';
import { DepartmentBatchView } from './views/DepartmentBatchView';
import { AlumniView } from './views/AlumniView';
import { AlumniProfileView } from './views/AlumniProfileView';
import { LiveNewsView } from './views/LiveNewsView';
import { NewsDetailView } from './views/NewsDetailView';
import { SearchPageView } from './views/SearchPageView';
import { AccountView } from './views/AccountView';
import { TermsView } from './views/TermsView';
import { CreatorView } from './views/CreatorView';

// Dedicated Isolated Admin Views
import { AdminLoginView } from './views/admin/AdminLoginView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { InstitutionAdminDashboardView } from './views/admin/InstitutionAdminDashboardView';

function getInitialPageFromPath(): { page: string; params: Record<string, string> } {
  if (typeof window === 'undefined') return { page: 'home', params: {} };
  const pathname = window.location.pathname.toLowerCase();

  if (pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard/')) {
    return { page: 'admin-dashboard', params: {} };
  }
  if (pathname === '/admin/login' || pathname === '/admin' || pathname === '/admin/') {
    return { page: 'admin-login', params: {} };
  }
  if (pathname === '/universities') return { page: 'universities', params: {} };
  if (pathname === '/department') return { page: 'department', params: {} };
  if (pathname === '/alumni') return { page: 'alumni', params: {} };
  if (pathname === '/news') return { page: 'news', params: {} };
  if (pathname === '/account') return { page: 'account', params: {} };
  if (pathname === '/terms') return { page: 'terms', params: {} };
  if (pathname === '/creator') return { page: 'creator', params: {} };
  if (pathname === '/search') {
    const searchParams = new URLSearchParams(window.location.search);
    return { page: 'search', params: { query: searchParams.get('query') || searchParams.get('q') || '' } };
  }

  return { page: 'home', params: {} };
}

const AdminDashboardRouter: React.FC<{
  onNavigatePublic: () => void;
  onLogoutSuccess: () => void;
  onBack?: () => void;
}> = (props) => {
  const { adminUser } = useAdmin();
  if (adminUser?.role === 'UNIVERSITY_ADMIN' || adminUser?.role === 'DEPARTMENT_ADMIN') {
    return <InstitutionAdminDashboardView onNavigatePublic={props.onNavigatePublic} onLogoutSuccess={props.onLogoutSuccess} />;
  }
  return <AdminDashboardView {...props} />;
};

export default function App() {
  const initial = getInitialPageFromPath();
  const [currentPage, setCurrentPage] = useState<string>(initial.page);
  const [pageParams, setPageParams] = useState<Record<string, string>>(initial.params);
  const [navHistory, setNavHistory] = useState<Array<{ page: string; params: Record<string, string> }>>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('alumniSphereDarkMode') === '1';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('alumniSphereDarkMode', darkMode ? '1' : '0');
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const getUpperPage = (
    page: string,
    params: Record<string, string>
  ): { page: string; params: Record<string, string> } => {
    switch (page) {
      case 'universityDetail':
        return { page: 'universities', params: {} };
      case 'departmentUniversities':
        return { page: 'department', params: {} };
      case 'departmentProfile':
        if (params.dept) {
          return { page: 'departmentUniversities', params: { dept: params.dept, group: params.group || 'Academic' } };
        }
        return { page: 'department', params: {} };
      case 'departmentBatch':
        if (params.dept && params.uni) {
          return { page: 'departmentProfile', params: { dept: params.dept, uni: params.uni } };
        }
        return { page: 'department', params: {} };
      case 'alumniProfile':
        return { page: 'alumni', params: {} };
      case 'newsDetail':
        return { page: 'news', params: {} };
      case 'universities':
      case 'department':
      case 'alumni':
      case 'news':
      case 'search':
      case 'account':
      case 'terms':
      case 'creator':
      case 'admin-login':
      case 'admin-dashboard':
        return { page: 'home', params: {} };
      default:
        return { page: 'home', params: {} };
    }
  };

  const handleNavigate = (page: string, params: Record<string, string> = {}) => {
    if (page !== currentPage || JSON.stringify(params) !== JSON.stringify(pageParams)) {
      setNavHistory((prev) => [...prev, { page: currentPage, params: pageParams }]);
    }
    setCurrentPage(page);
    setPageParams(params);

    // Synchronize browser URL bar and history
    let newPath = '/';
    if (page === 'admin-login' || page === 'admin') newPath = '/admin/login';
    else if (page === 'admin-dashboard') newPath = '/admin/dashboard';
    else if (page === 'universities') newPath = '/universities';
    else if (page === 'department') newPath = '/department';
    else if (page === 'alumni') newPath = '/alumni';
    else if (page === 'news') newPath = '/news';
    else if (page === 'account') newPath = '/account';
    else if (page === 'terms') newPath = '/terms';
    else if (page === 'creator') newPath = '/creator';
    else if (page === 'search') newPath = '/search';

    if (window.location.pathname !== newPath || window.history.state?.page !== page) {
      window.history.pushState({ page, params }, '', newPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    // If navigation history stack has a previous page, return to it
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((old) => old.slice(0, old.length - 1));
      setCurrentPage(prev.page);
      setPageParams(prev.params);

      let newPath = '/';
      if (prev.page === 'admin-login' || prev.page === 'admin') newPath = '/admin/login';
      else if (prev.page === 'admin-dashboard') newPath = '/admin/dashboard';
      else if (prev.page === 'universities') newPath = '/universities';
      else if (prev.page === 'department') newPath = '/department';
      else if (prev.page === 'alumni') newPath = '/alumni';
      else if (prev.page === 'news') newPath = '/news';
      else if (prev.page === 'account') newPath = '/account';
      else if (prev.page === 'terms') newPath = '/terms';
      else if (prev.page === 'creator') newPath = '/creator';
      else if (prev.page === 'search') newPath = '/search';

      if (window.location.pathname !== newPath || window.history.state?.page !== prev.page) {
        window.history.pushState({ page: prev.page, params: prev.params }, '', newPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Otherwise, move to the hierarchical upper page
    const upper = getUpperPage(currentPage, pageParams);
    setCurrentPage(upper.page);
    setPageParams(upper.params);

    let newPath = '/';
    if (upper.page === 'universities') newPath = '/universities';
    else if (upper.page === 'department') newPath = '/department';
    else if (upper.page === 'alumni') newPath = '/alumni';
    else if (upper.page === 'news') newPath = '/news';
    else if (upper.page === 'account') newPath = '/account';
    else if (upper.page === 'terms') newPath = '/terms';
    else if (upper.page === 'creator') newPath = '/creator';
    else if (upper.page === 'search') newPath = '/search';

    if (window.location.pathname !== newPath || window.history.state?.page !== upper.page) {
      window.history.pushState({ page: upper.page, params: upper.params }, '', newPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Browser back / forward button synchronization
  useEffect(() => {
    // Seed initial history state
    if (!window.history.state?.page) {
      window.history.replaceState({ page: initial.page, params: initial.params }, '', window.location.pathname + window.location.search);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setCurrentPage(event.state.page);
        setPageParams(event.state.params || {});
        return;
      }
      const state = getInitialPageFromPath();
      setCurrentPage(state.page);
      setPageParams(state.params);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = (query: string) => {
    setCurrentPage('search');
    setPageParams({ query });
    if (window.location.pathname !== '/search' || window.history.state?.page !== 'search') {
      window.history.pushState({ page: 'search', params: { query } }, '', '/search');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // ISOLATED ADMIN PORTAL ROUTING
  // ==========================================

  // Admin Login route: /admin/login or /admin
  if (currentPage === 'admin-login' || currentPage === 'admin') {
    return (
      <AuthProvider>
        <DataProvider>
          <AdminProvider>
            <AdminLoginView
              onNavigatePublic={() => handleNavigate('home')}
              onLoginSuccess={() => handleNavigate('admin-dashboard')}
              onBack={handleBack}
            />
          </AdminProvider>
        </DataProvider>
      </AuthProvider>
    );
  }

  // Admin Dashboard route: /admin/dashboard
  // Access is strictly verified by server-side Admin Auth Check
  if (currentPage === 'admin-dashboard') {
    return (
      <AuthProvider>
        <DataProvider>
          <AdminProvider>
            <AdminDashboardRouter
              onNavigatePublic={() => handleNavigate('home')}
              onLogoutSuccess={() => handleNavigate('admin-login')}
              onBack={handleBack}
            />
          </AdminProvider>
        </DataProvider>
      </AuthProvider>
    );
  }

  // ==========================================
  // USER WEBSITE ROUTING (NORMAL USER EXPERIENCE)
  // ==========================================
  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen flex flex-col justify-between">
          <div>
            <Navbar
              currentPage={currentPage}
              onNavigate={handleNavigate}
              onBack={handleBack}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />

            <main>
              {currentPage === 'home' && (
                <HomeView onNavigate={handleNavigate} onSearch={handleSearch} />
              )}

              {currentPage === 'universities' && (
                <UniversitiesView onNavigate={handleNavigate} onBack={handleBack} />
              )}

              {currentPage === 'universityDetail' && (
                <UniversityDetailView
                  universityName={pageParams.name || 'University of Dhaka'}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'department' && (
                <DepartmentsView onNavigate={handleNavigate} onBack={handleBack} />
              )}

              {currentPage === 'departmentUniversities' && (
                <DepartmentUniversitiesView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  departmentGroup={pageParams.group || 'Engineering'}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'departmentProfile' && (
                <DepartmentProfileView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  universityName={pageParams.uni || 'University of Dhaka'}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'departmentBatch' && (
                <DepartmentBatchView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  universityName={pageParams.uni || 'University of Dhaka'}
                  batchYear={pageParams.batch || '2023'}
                  batchNumber={pageParams.batchNumber ? Number(pageParams.batchNumber) : undefined}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'alumni' && <AlumniView onNavigate={handleNavigate} onBack={handleBack} />}

              {currentPage === 'alumniProfile' && (
                <AlumniProfileView
                  alumniId={pageParams.id}
                  alumniName={pageParams.name}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'news' && <LiveNewsView onNavigate={handleNavigate} onBack={handleBack} />}

              {currentPage === 'newsDetail' && (
                <NewsDetailView
                  articleId={pageParams.id || 'news-1'}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'search' && (
                <SearchPageView
                  initialQuery={pageParams.query || ''}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                />
              )}

              {currentPage === 'account' && <AccountView onNavigate={handleNavigate} onBack={handleBack} />}

              {currentPage === 'terms' && <TermsView onNavigate={handleNavigate} onBack={handleBack} />}

              {currentPage === 'creator' && <CreatorView onNavigate={handleNavigate} onBack={handleBack} />}
            </main>
          </div>

          <Footer onNavigate={handleNavigate} />
        </div>
      </DataProvider>
    </AuthProvider>
  );
}
