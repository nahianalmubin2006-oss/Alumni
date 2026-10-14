import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  Sparkles,
  Users,
  Handshake,
  CheckCircle2,
  Bot,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  TrendingUp,
} from 'lucide-react';

interface LiveActivityTickerProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface ActivityEvent {
  id: string;
  type: 'mentorship' | 'connection' | 'verification' | 'news' | 'batch';
  badge: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  targetPage: string;
  targetParams?: Record<string, string>;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({ onNavigate }) => {
  const { alumni, news, batches, connectionRequests } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Generate dynamic live activities combining real platform data and milestones
  const activities: ActivityEvent[] = useMemo(() => {
    const list: ActivityEvent[] = [];

    // 1. Recent verified alumni
    const verifiedList = alumni.filter((a) => a.isVerified && a.company);
    verifiedList.slice(0, 3).forEach((a, idx) => {
      list.push({
        id: `act-alumni-${idx}-${a.id}`,
        type: 'verification',
        badge: 'Verified Milestone',
        actor: a.name,
        action: `updated verified career at`,
        target: `${a.company} (${a.jobRole || 'Engineer'})`,
        timestamp: 'Just now',
        targetPage: 'alumniProfile',
        targetParams: { id: a.id, name: a.name },
      });
    });

    // 2. Mentorship availability
    const mentors = alumni.filter((a) => a.mentorshipOpen !== false);
    if (mentors.length > 0) {
      const m = mentors[0];
      list.push({
        id: `act-mentor-${m.id}`,
        type: 'mentorship',
        badge: 'Mentorship Active',
        actor: m.name,
        action: 'is open for student career mentorship in',
        target: m.department || 'Technology',
        timestamp: 'Active today',
        targetPage: 'alumniProfile',
        targetParams: { id: m.id, name: m.name },
      });
    }

    // 3. Recent News / AI Wire achievement
    const hotNews = news.find((n) => n.isHotTopic) || news[0];
    if (hotNews) {
      list.push({
        id: `act-news-${hotNews.id}`,
        type: 'news',
        badge: 'AI Wire Breakthrough',
        actor: hotNews.university || 'National Network',
        action: 'indexed research achievement:',
        target: hotNews.title,
        timestamp: '2h ago',
        targetPage: 'newsDetail',
        targetParams: { id: hotNews.id },
      });
    }

    // 4. Batch & Institutional intelligence
    list.push({
      id: 'act-batch-du',
      type: 'batch',
      badge: 'Cohort Archive',
      actor: 'Dhaka University CSE',
      action: 'traced 32 cohorts spanning',
      target: '1994 founding pioneer class to 2029',
      timestamp: 'Live index',
      targetPage: 'departmentProfile',
      targetParams: { dept: 'Computer Science and Engineering', uni: 'University of Dhaka' },
    });

    // 5. Global Chapter expansion
    list.push({
      id: 'act-diaspora',
      type: 'connection',
      badge: 'Global Diaspora',
      actor: '25+ Destination Countries',
      action: 'active chapters in',
      target: 'Munich, Silicon Valley, London, Singapore & Tokyo',
      timestamp: 'Synchronized',
      targetPage: 'alumni',
      targetParams: {},
    });

    return list;
  }, [alumni, news, batches, connectionRequests]);

  // Auto-advance ticker
  useEffect(() => {
    if (isPaused || activities.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, activities.length]);

  if (activities.length === 0) return null;

  const current = activities[currentIndex];

  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'mentorship':
        return <Handshake className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'verification':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'news':
        return <Bot className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'batch':
        return <GraduationCap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default:
        return <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div
      className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Live platform activity stream"
    >
      <div className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left Live Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span className="hidden sm:inline">Network Pulse</span>
            <span className="sm:hidden">Pulse</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
        </div>

        {/* Center Live Event Content */}
        <div
          onClick={() => onNavigate(current.targetPage, current.targetParams)}
          className="flex-1 min-w-0 cursor-pointer group flex items-center gap-2 text-xs"
          title="Click to view details"
        >
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {getIcon(current.type)}
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {current.badge}
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          </div>

          <div className="truncate text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <b className="font-semibold text-slate-900 dark:text-white mr-1.5">{current.actor}</b>
            <span className="text-slate-500 dark:text-slate-400 mr-1.5">{current.action}</span>
            <span className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline">{current.target}</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
        </div>

        {/* Right Navigation & Pause Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums hidden md:inline mr-1">
            {currentIndex + 1}/{activities.length}
          </span>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + activities.length) % activities.length)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Previous event"
            aria-label="Previous event"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isPaused ? 'Resume live rotation' : 'Pause live rotation'}
            aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-600" /> : <Pause className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % activities.length)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Next event"
            aria-label="Next event"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Thin Animated Progress Line */}
      {!isPaused && (
        <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            key={currentIndex}
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-[pulse_4.5s_linear]"
            style={{ animationDuration: '4.5s' }}
          />
        </div>
      )}
    </div>
  );
};
