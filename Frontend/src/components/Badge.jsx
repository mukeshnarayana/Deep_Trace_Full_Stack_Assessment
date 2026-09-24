import React from 'react';

export const Badge = ({ children, variant, size = 'sm', className = '' }) => {
  // Map normalized string to badge style
  const getBadgeStyle = (type) => {
    switch (String(type).toUpperCase()) {
      // Severities (explicitly requested: LOW gray, MEDIUM amber, HIGH orange, CRITICAL red)
      case 'LOW':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'CRITICAL':
        return 'bg-red-50 text-red-800 border-red-200 font-semibold';

      // Statuses (Event & Campaign)
      case 'OPEN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'INVESTIGATING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-600 border-gray-200';

      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-500 border-gray-200 line-through';

      // User roles
      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      case 'MANAGER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'USER':
        return 'bg-gray-100 text-gray-700 border-gray-200';

      // User status
      case 'ACTIVE_USER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DEACTIVATED':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[11px] leading-tight',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const styleClass = getBadgeStyle(variant || children);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border tracking-wide uppercase ${sizeClasses[size] || sizeClasses.sm} ${styleClass} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
