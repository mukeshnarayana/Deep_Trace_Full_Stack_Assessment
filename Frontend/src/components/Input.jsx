import React, { forwardRef, useId } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      id,
      name,
      type = 'text',
      value,
      onChange,
      placeholder,
      error,
      helperText,
      required = false,
      disabled = false,
      icon: Icon,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || name || generatedId;

    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`block w-full rounded-lg text-sm transition-colors duration-150 border bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ${
              Icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
                : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-600'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
