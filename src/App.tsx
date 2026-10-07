import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

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
import { SuperAdminView } from './views/SuperAdminView';
import { UniversityAdminView } from './views/UniversityAdminView';
import { DepartmentAdminView } from './views/DepartmentAdminView';
import { TermsView } from './views/TermsView';
import { CreatorView } from './views/CreatorView';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    setCurrentPage('search');
    setPageParams({ query });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
                  universityName={pageParams.name || 'Bangladesh University of Professionals'}
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
                  universityName={pageParams.uni || 'Bangladesh University of Professionals'}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'departmentBatch' && (
                <DepartmentBatchView
                  departmentName={pageParams.dept || 'Computer Science & Engineering'}
                  universityName={pageParams.uni || 'Bangladesh University of Professionals'}
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

              {currentPage === 'admin' && <SuperAdminView onNavigate={handleNavigate} />}

              {currentPage === 'university-admin' && (
                <UniversityAdminView onNavigate={handleNavigate} />
              )}

              {currentPage === 'department-admin' && (
                <DepartmentAdminView onNavigate={handleNavigate} />
              )}

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
