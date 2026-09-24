import React from 'react';
import Spinner from './Spinner';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 border border-transparent focus:ring-indigo-500 shadow-sm',
    secondary:
      'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 border border-gray-300 focus:ring-indigo-500 shadow-sm',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-transparent focus:ring-rose-500 shadow-sm',
    dangerOutline:
      'bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 focus:ring-rose-500',
    ghost:
      'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 border border-transparent focus:ring-indigo-500',
    outline:
      'bg-transparent text-indigo-600 hover:bg-indigo-50 border border-indigo-200 focus:ring-indigo-500',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {isLoading && (
        <Spinner
          size="sm"
          color={variant === 'primary' || variant === 'danger' ? 'text-white' : 'text-indigo-600'}
        />
      )}
      {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
};

export default Button;
