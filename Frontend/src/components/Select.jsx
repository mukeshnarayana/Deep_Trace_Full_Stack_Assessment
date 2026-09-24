import React, { forwardRef, useId } from 'react';

export const Select = forwardRef(
  (
    {
      label,
      id,
      name,
      value,
      onChange,
      options = [],
      placeholder,
      error,
      helperText,
      required = false,
      disabled = false,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || name || generatedId;

    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          className={`block w-full rounded-lg text-sm transition-colors duration-150 border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-600'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const labelText = typeof opt === 'object' ? opt.label : opt;
            const isDisabled = typeof opt === 'object' ? opt.disabled : false;
            return (
              <option key={val} value={val} disabled={isDisabled}>
                {labelText}
              </option>
            );
          })}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-xs text-rose-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
