import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';

export const ForbiddenPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
        <ShieldX className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">403 - Access Denied</h1>
      <p className="text-sm text-gray-600 max-w-md mt-2 mb-1">
        Your current role (<span className="font-semibold text-gray-900">{user?.role || 'Guest'}</span>) does not have sufficient permissions to access this security resource.
      </p>
      <p className="text-xs text-gray-400 max-w-sm mb-6">
        Please contact your tenant administrator if you require elevated privileges.
      </p>
      <Link to="/dashboard">
        <Button variant="secondary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default ForbiddenPage;
