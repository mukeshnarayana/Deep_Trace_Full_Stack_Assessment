import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  ShieldAlert,
  Users,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MANAGER', 'USER'],
    },
    {
      to: '/campaigns',
      label: 'Campaigns',
      icon: Target,
      roles: ['ADMIN', 'MANAGER', 'USER'],
    },
    {
      to: '/security-events',
      label: 'Security Events',
      icon: ShieldAlert,
      roles: ['ADMIN', 'MANAGER', 'USER'],
    },
    {
      to: '/users',
      label: 'Users',
      icon: Users,
      roles: ['ADMIN', 'MANAGER'], // Hidden from USER
    },
    {
      to: '/audit-logs',
      label: 'Audit Logs',
      icon: FileText,
      roles: ['ADMIN'], // Hidden from MANAGER and USER
    },
  ];

  // Filter items based on user's role
  const visibleNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Brand logo & platform title */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight tracking-tight">
              AegisGuard
            </div>
            <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
              Security Platform
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Management
        </div>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Tenant isolation badge in sidebar bottom */}
      <div className="p-4 m-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
        <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Tenant Scoped
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          Role-enforced boundary. Cross-tenant leakage blocked by API.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transition-transform duration-200 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
