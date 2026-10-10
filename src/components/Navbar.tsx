import React, { useState, useEffect, useRef } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Role } from '../types';
import { ArrowLeft } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

interface HelpItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  onAction?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onBack,
  darkMode,
  onToggleDarkMode,
}) => {
  const {
    currentUser,
    userProfile,
    effectiveRole,
    isSuperAdmin,
    simulatedRole,
    setSimulatedRole,
    logout,
  } = useAuth();
  const { notifications, markNotificationRead, clearNotifications } = useData();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  // Helping info state
  const [hoveredHelp, setHoveredHelp] = useState<HelpItem | null>(null);
  const [mobileHelpModal, setMobileHelpModal] = useState<HelpItem | null>(null);
  const [activePressId, setActivePressId] = useState<string | null>(null);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef<boolean>(false);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
        setHoveredHelp(null);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter(
    (n) =>
      !n.read &&
      (n.recipientId === currentUser?.uid || (isSuperAdmin && n.recipientId === 'ADMIN'))
  );

  // Touch handlers for mobile: press for more than 3 seconds to trigger helping info
  const handleTouchStart = (item: HelpItem) => {
    longPressFiredRef.current = false;
    setActivePressId(item.id);

    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setActivePressId(null);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
      setMobileHelpModal(item);
    }, 3000); // exactly 3 seconds
  };

  const handleTouchEnd = (onClick: () => void) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setActivePressId(null);

    // If the 3-second long press did not fire, execute normal tap
    if (!longPressFiredRef.current) {
      onClick();
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setActivePressId(null);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-soft">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand & Contextual Back Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-navy text-white flex items-center justify-center font-black text-lg shadow-sm">
              A
            </div>
            <div>
              <div className="font-extrabold navy tracking-tight text-sm sm:text-base leading-tight">
                AlumniSphere
              </div>
              <div className="hidden sm:block text-[9px] uppercase tracking-[.18em] text-slate-400">
                University intelligence
              </div>
            </div>
          </button>

          {/* Quick Upper / Previous Page Back Button */}
          {currentPage !== 'home' && (
            <button
              type="button"
              onClick={onBack ? onBack : () => onNavigate('home')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-bold transition shadow-xs cursor-pointer group"
              title="Return to previous / upper page"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Clean Main Navigation Tabs (original 5 tabs, no duplicate admin button) */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onNavigate('home')}
            className={`navbtn px-3 py-2 rounded-lg text-sm font-semibold transition ${
              currentPage === 'home' ? 'active' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onNavigate('universities')}
            className={`navbtn px-3 py-2 rounded-lg text-sm font-semibold transition ${
              currentPage === 'universities' ? 'active' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Universities
          </button>
          <button
            onClick={() => onNavigate('department')}
            className={`navbtn px-3 py-2 rounded-lg text-sm font-semibold transition ${
              currentPage === 'department' ? 'active' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => onNavigate('alumni')}
            className={`navbtn px-3 py-2 rounded-lg text-sm font-semibold transition ${
              currentPage === 'alumni' ? 'active' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alumni
          </button>
          <button
            onClick={() => onNavigate('news')}
            className={`navbtn px-3 py-2 rounded-lg text-sm font-semibold transition ${
              currentPage === 'news' ? 'active' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live News
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search Trigger */}
          <button
            onClick={() => onNavigate('search')}
            className="hidden sm:flex items-center gap-2 border border-soft bg-white px-3 py-2 rounded-xl text-sm text-slate-500 hover:border-slate-300 transition"
          >
            <span className="text-slate-400">⌕</span>
            <span>Search</span>
          </button>

          {/* Notifications button if logged in */}
          {currentUser && (
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                className="w-10 h-10 rounded-xl border border-soft bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 relative transition"
                title="Notifications"
              >
                <span className="text-base">🔔</span>
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                  </span>
                )}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[24rem] card p-3 z-50 max-h-[460px] flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-soft px-1">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-soft mt-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-left transition ${
                            !n.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <b className="text-xs text-slate-900 block">{n.title}</b>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1"
                                title="Mark as read"
                              />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                            {n.actionUrl && (
                              <button
                                onClick={() => {
                                  markNotificationRead(n.id);
                                  setNotifMenuOpen(false);
                                  if (n.actionUrl) {
                                    onNavigate(n.actionUrl.replace('/', ''));
                                  }
                                }}
                                className="text-blue-600 font-semibold"
                              >
                                View →
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role Status Pill if logged in */}
          {currentUser && (
            <button
              onClick={() => onNavigate('account')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-soft bg-white text-xs font-semibold hover:border-blue-300 transition cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  userProfile?.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="navy truncate max-w-[120px]">
                {userProfile?.isVerifiedAlumni
                  ? 'Verified Alumni'
                  : userProfile?.profileType === 'Alumni'
                  ? 'Alumni'
                  : userProfile?.profileType === 'Student'
                  ? 'Student'
                  : userProfile?.name || 'Member'}
              </span>
            </button>
          )}

          {/* Direct Log in / Sign up button if logged out */}
          {!currentUser && (
            <button
              onClick={() => onNavigate('account')}
              className="bg-navy hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Log in / Sign up</span>
            </button>
          )}

          {/* 3-Dot More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => {
                setMoreMenuOpen(!moreMenuOpen);
                setHoveredHelp(null);
              }}
              aria-label="More options"
              className="w-10 h-10 rounded-xl border border-soft bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
            >
              <span className="text-xl leading-none tracking-[2px]">•••</span>
            </button>

            {moreMenuOpen && (
              <div className="relative">
                {/* Desktop Floating Helping Info Card */}
                {hoveredHelp && (
                  <div className="hidden md:block absolute right-[280px] top-0 w-72 card p-4 shadow-2xl bg-white border border-blue-200 z-50 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-soft">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {hoveredHelp.icon}
                      </span>
                      <div>
                        <b className="navy text-xs block leading-tight">{hoveredHelp.title}</b>
                        <span className="text-[10px] text-slate-400">{hoveredHelp.subtitle}</span>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                        ℹ Helping Info
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {hoveredHelp.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-soft text-[10px] text-slate-400 flex items-center justify-between">
                      <span>💡 Click to open this section</span>
                      <span className="text-blue-600 font-semibold">AlumniSphere</span>
                    </div>
                  </div>
                )}

                {/* 3-Dot Dropdown Menu (Clean, without extra separator lines) */}
                <div className="absolute right-0 top-2 w-[calc(100vw-1.5rem)] max-w-64 card p-2 z-50 shadow-2xl">
                  {/* Item 1: Profile & Account */}
                  {(() => {
                    const item: HelpItem = {
                      id: 'account',
                      title: currentUser ? 'Profile & Account' : 'Log in / Sign up',
                      subtitle: currentUser
                        ? userProfile?.name || currentUser.email || 'Alumni member'
                        : 'Access your student or alumni profile',
                      description:
                        'Manage your personal academic standing, credentials, and institutional profile. Edit graduation year, current role, company, location, and apply for verified alumni status.',
                      icon: '◉',
                      onAction: () => onNavigate('account'),
                    };
                    const isPressing = activePressId === item.id;

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setHoveredHelp(item)}
                        onMouseLeave={() => setHoveredHelp(null)}
                        onTouchStart={() => handleTouchStart(item)}
                        onTouchEnd={() =>
                          handleTouchEnd(() => {
                            setMoreMenuOpen(false);
                            onNavigate('account');
                          })
                        }
                        onTouchMove={handleTouchMove}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onNavigate('account');
                        }}
                        className={`menu-item transition relative ${
                          isPressing ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                        }`}
                      >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="text-left font-semibold text-sm flex-1">
                          {item.title}
                        </span>
                        {isPressing && (
                          <span className="absolute right-2 top-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                            Hold 3s...
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Item 2: Dark Mode - No extra dividing line */}
                  {(() => {
                    const item: HelpItem = {
                      id: 'dark-mode',
                      title: darkMode ? 'Light Mode' : 'Dark Mode',
                      subtitle: 'Change website appearance',
                      description:
                        'Toggle between daylight navy background and midnight dark mode for comfortable reading.',
                      icon: '☾',
                      onAction: () => onToggleDarkMode(),
                    };
                    const isPressing = activePressId === item.id;

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setHoveredHelp(item)}
                        onMouseLeave={() => setHoveredHelp(null)}
                        onTouchStart={() => handleTouchStart(item)}
                        onTouchEnd={() =>
                          handleTouchEnd(() => {
                            onToggleDarkMode();
                            setMoreMenuOpen(false);
                          })
                        }
                        onTouchMove={handleTouchMove}
                        onClick={() => {
                          onToggleDarkMode();
                          setMoreMenuOpen(false);
                        }}
                        className={`menu-item transition relative ${
                          isPressing ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                        }`}
                      >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="text-left font-semibold text-sm flex-1">
                          {item.title}
                        </span>
                        {isPressing && (
                          <span className="absolute right-2 top-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                            Hold 3s...
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Item 7: Terms & Policy - No extra dividing line */}
                  {(() => {
                    const item: HelpItem = {
                      id: 'terms',
                      title: 'Terms & Policy',
                      subtitle: 'Platform rules and privacy',
                      description:
                        'Review institutional terms of use, personal data security measures, degree verification criteria, and member code of conduct.',
                      icon: '§',
                      onAction: () => onNavigate('terms'),
                    };
                    const isPressing = activePressId === item.id;

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setHoveredHelp(item)}
                        onMouseLeave={() => setHoveredHelp(null)}
                        onTouchStart={() => handleTouchStart(item)}
                        onTouchEnd={() =>
                          handleTouchEnd(() => {
                            setMoreMenuOpen(false);
                            onNavigate('terms');
                          })
                        }
                        onTouchMove={handleTouchMove}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onNavigate('terms');
                        }}
                        className={`menu-item transition relative ${
                          isPressing ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                        }`}
                      >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="text-left font-semibold text-sm flex-1">
                          {item.title}
                        </span>
                        {isPressing && (
                          <span className="absolute right-2 top-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                            Hold 3s...
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Item 8: Creator Info - No extra dividing line */}
                  {(() => {
                    const item: HelpItem = {
                      id: 'creator',
                      title: 'Creator Info',
                      subtitle: 'About Nahian Al Mubin (Platform Founder)',
                      description:
                        'Discover the vision and story behind AlumniSphere created by Nahian Al Mubin to connect students and map graduate trajectories across all universities.',
                      icon: '★',
                      onAction: () => onNavigate('creator'),
                    };
                    const isPressing = activePressId === item.id;

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setHoveredHelp(item)}
                        onMouseLeave={() => setHoveredHelp(null)}
                        onTouchStart={() => handleTouchStart(item)}
                        onTouchEnd={() =>
                          handleTouchEnd(() => {
                            setMoreMenuOpen(false);
                            onNavigate('creator');
                          })
                        }
                        onTouchMove={handleTouchMove}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onNavigate('creator');
                        }}
                        className={`menu-item transition relative ${
                          isPressing ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                        }`}
                      >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="text-left font-semibold text-sm flex-1">
                          {item.title}
                        </span>
                        {isPressing && (
                          <span className="absolute right-2 top-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                            Hold 3s...
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Item 9: Log out if authenticated - No extra dividing line */}
                  {currentUser &&
                    (() => {
                      const item: HelpItem = {
                        id: 'logout',
                        title: 'Log out',
                        subtitle: 'End this session',
                        description:
                          'Sign out of your active account session on this device. You can log back in anytime.',
                        icon: '↪',
                        onAction: () => logout(),
                      };
                      const isPressing = activePressId === item.id;

                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setHoveredHelp(item)}
                          onMouseLeave={() => setHoveredHelp(null)}
                          onTouchStart={() => handleTouchStart(item)}
                          onTouchEnd={() =>
                            handleTouchEnd(() => {
                              logout();
                              setMoreMenuOpen(false);
                              onNavigate('home');
                            })
                          }
                          onTouchMove={handleTouchMove}
                          onClick={() => {
                            logout();
                            setMoreMenuOpen(false);
                            onNavigate('home');
                          }}
                          className={`menu-item text-rose-600 hover:bg-rose-50 transition relative ${
                            isPressing ? 'bg-rose-100 ring-2 ring-rose-400' : ''
                          }`}
                        >
                          <span className="menu-icon bg-rose-50 text-rose-600">{item.icon}</span>
                          <span className="text-left font-semibold text-sm flex-1 text-rose-600">
                            {item.title}
                          </span>
                          {isPressing && (
                            <span className="absolute right-2 top-2 text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                              Hold 3s...
                            </span>
                          )}
                        </button>
                      );
                    })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="md:hidden border-t border-soft bg-white/80 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button onClick={() => onNavigate('home')} className="navbtn px-3 py-1.5 rounded-lg text-xs font-bold">Explore</button>
          <button onClick={() => onNavigate('universities')} className="navbtn px-3 py-1.5 rounded-lg text-xs font-bold">Universities</button>
          <button onClick={() => onNavigate('department')} className="navbtn px-3 py-1.5 rounded-lg text-xs font-bold">Departments</button>
          <button onClick={() => onNavigate('alumni')} className="navbtn px-3 py-1.5 rounded-lg text-xs font-bold">Alumni</button>
          <button onClick={() => onNavigate('news')} className="navbtn px-3 py-1.5 rounded-lg text-xs font-bold">Live News</button>
        </div>
      </nav>

      {/* Mobile 3-Second Long Press Helping Info Modal */}
      {mobileHelpModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 shadow-2xl bg-white animate-in slide-in-from-bottom duration-200 border border-blue-200">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-black">
                  {mobileHelpModal.icon}
                </span>
                <div>
                  <b className="navy text-sm block">{mobileHelpModal.title}</b>
                  <span className="text-xs text-slate-400">{mobileHelpModal.subtitle}</span>
                </div>
              </div>
              <button
                onClick={() => setMobileHelpModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
                aria-label="Close helping info"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                ℹ Helping Information
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {mobileHelpModal.description}
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setMobileHelpModal(null)}
                className="flex-1 py-2.5 border border-soft rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              {mobileHelpModal.onAction && (
                <button
                  onClick={() => {
                    const act = mobileHelpModal.onAction;
                    setMobileHelpModal(null);
                    setMoreMenuOpen(false);
                    act?.();
                  }}
                  className="flex-1 py-2.5 bg-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Open Section →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
