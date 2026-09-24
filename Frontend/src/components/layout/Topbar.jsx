import React from 'react';
import { LogOut, Building2, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../Badge';

export const Topbar = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();

  const tenantName = user?.tenant?.name || 'Multi-Tenant Org';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200">
      {/* Left: Mobile hamburger & Organization info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
          <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-800 tracking-wide uppercase">
            {tenantName}
          </span>
        </div>
      </div>

      {/* Right: User name, role badge, and Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.name || 'Authenticated User'}
            </div>
            <div className="text-xs text-gray-500 leading-tight mt-0.5">
              {user?.email}
            </div>
          </div>
          <Badge variant={user?.role} size="sm">
            {user?.role}
          </Badge>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={logout}
          title="Sign out of your session"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-rose-600 rounded-lg border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
