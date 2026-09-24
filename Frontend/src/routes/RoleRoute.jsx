import React from 'react';
import { useAuth } from '../hooks/useAuth';
import ForbiddenPage from '../pages/ForbiddenPage';
import Spinner from '../components/Spinner';

export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Spinner size="md" color="text-indigo-600" />
      </div>
    );
  }

  if (!user || !hasRole(allowedRoles)) {
    return <ForbiddenPage />;
  }

  return children;
};

export default RoleRoute;
