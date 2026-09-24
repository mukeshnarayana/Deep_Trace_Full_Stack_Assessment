import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-gray-500 max-w-md mt-2 mb-6">
        The requested resource or page does not exist or may have been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="secondary" icon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
