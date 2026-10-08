import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AdminProvider } from './context/AdminContext';
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

  return { page: 'home', params: {} };
}

export default function App() {
  const initial = getInitialPageFromPath();
  const [currentPage, setCurrentPage] = useState<string>(initial.page);
  const [pageParams, setPageParams] = useState<Record<string, string>>(initial.params);
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

  const handleNavigate = (page: string, params: Record<string, string> = {}) => {
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

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Browser back / forward button synchronization
  useEffect(() => {
    const handlePopState = () => {
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
    if (window.location.pathname !== '/search') {
      window.history.pushState({}, '', '/search');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // ISOLATED ADMIN PORTAL ROUTING
  // ==========================================

  // Admin Login route: /admin/login or /admin
  if (currentPage === 'admin-login' || currentPage === 'admin') {
    return (
      <AdminProvider>
        <AdminLoginView
          onNavigatePublic={() => handleNavigate('home')}
          onLoginSuccess={() => handleNavigate('admin-dashboard')}
        />
      </AdminProvider>
    );
  }

  // Admin Dashboard route: /admin/dashboard
  // Access is strictly verified by server-side Admin Auth Check
  if (currentPage === 'admin-dashboard') {
    return (
      <AdminProvider>
        <AdminDashboardView
          onNavigatePublic={() => handleNavigate('home')}
          onLogoutSuccess={() => handleNavigate('admin-login')}
        />
      </AdminProvider>
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
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />

            <main>
              {currentPage === 'home' && (
                <HomeView onNavigate={handleNavigate} onSearch={handleSearch} />
              )}

              {currentPage === 'universities' && (
                <UniversitiesView onNavigate={handleNavigate} />
              )}

              {currentPage === 'universityDetail' && (
                <UniversityDetailView
                  universityName={pageParams.name || 'University of Dhaka'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'department' && (
                <DepartmentsView onNavigate={handleNavigate} />
              )}

              {currentPage === 'departmentUniversities' && (
                <DepartmentUniversitiesView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  departmentGroup={pageParams.group || 'Engineering'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'departmentProfile' && (
                <DepartmentProfileView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  universityName={pageParams.uni || 'University of Dhaka'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'departmentBatch' && (
                <DepartmentBatchView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  universityName={pageParams.uni || 'University of Dhaka'}
                  batchYear={pageParams.batch || '2023'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'alumni' && <AlumniView onNavigate={handleNavigate} />}

              {currentPage === 'alumniProfile' && (
                <AlumniProfileView
                  alumniId={pageParams.id}
                  alumniName={pageParams.name}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'news' && <LiveNewsView onNavigate={handleNavigate} />}

              {currentPage === 'newsDetail' && (
                <NewsDetailView
                  articleId={pageParams.id || 'news-1'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'search' && (
                <SearchPageView initialQuery={pageParams.query || ''} onNavigate={handleNavigate} />
              )}

              {currentPage === 'account' && <AccountView onNavigate={handleNavigate} />}

              {currentPage === 'terms' && <TermsView onNavigate={handleNavigate} />}

              {currentPage === 'creator' && <CreatorView onNavigate={handleNavigate} />}
            </main>
          </div>

          <Footer onNavigate={handleNavigate} />
        </div>
      </DataProvider>
    </AuthProvider>
  );
}
