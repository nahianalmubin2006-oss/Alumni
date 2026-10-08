import React, { useState } from 'react';
import { getUniversityLogo, universityInitials } from '../data/initialData';

interface UniversityLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showInitialsFallback?: boolean;
}

export const UniversityLogo: React.FC<UniversityLogoProps> = ({
  name,
  logoUrl,
  className = '',
  size = 'md',
  showInitialsFallback = true,
}) => {
  const [hasError, setHasError] = useState(false);

  // Determine logo source
  const src = !hasError ? (logoUrl || getUniversityLogo(name)) : undefined;
  const initials = universityInitials(name || 'University');

  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  }[size];

  // Derive university themed color for initials fallback
  const getThemedBadgeColor = (uniName: string) => {
    const l = (uniName || '').toLowerCase();
    if (l.includes('engineering') || l.includes('technology') || l.includes('buet')) {
      return 'bg-gradient-to-br from-blue-900 to-indigo-950 text-sky-300 border-blue-700/60';
    }
    if (l.includes('agriculture') || l.includes('agricultural')) {
      return 'bg-gradient-to-br from-emerald-900 to-teal-950 text-emerald-300 border-emerald-700/60';
    }
    if (l.includes('medical') || l.includes('health')) {
      return 'bg-gradient-to-br from-rose-900 to-red-950 text-rose-300 border-rose-700/60';
    }
    if (l.includes('maritime') || l.includes('ocean')) {
      return 'bg-gradient-to-br from-cyan-900 to-blue-950 text-cyan-300 border-cyan-700/60';
    }
    if (l.includes('aviation') || l.includes('aerospace')) {
      return 'bg-gradient-to-br from-blue-950 to-slate-900 text-blue-300 border-blue-700/60';
    }
    if (l.includes('islamic') || l.includes('arabic')) {
      return 'bg-gradient-to-br from-teal-900 to-emerald-950 text-amber-300 border-teal-700/60';
    }
    return 'bg-gradient-to-br from-slate-900 to-navy text-amber-300 border-slate-700/60';
  };

  if (!src || hasError) {
    if (!showInitialsFallback) return null;
    return (
      <div
        className={`${sizeClasses} rounded-xl border flex items-center justify-center font-black shadow-xs shrink-0 select-none ${getThemedBadgeColor(
          name
        )} ${className}`}
        title={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white border border-slate-200/90 shadow-xs shrink-0 p-1 ${sizeClasses} ${className}`}
      title={name}
    >
      <img
        src={src}
        alt={`${name} official logo`}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain filter drop-shadow-xs transition duration-200"
        loading="lazy"
      />
    </div>
  );
};
