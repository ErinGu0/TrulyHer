import React from 'react';

export const Textarea = ({ 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  rows = 4,
  variant = 'default',
  label,
  error,
  success,
  disabled = false,
  ...props 
}) => {
  const baseStyles = `
    w-full rounded-xl p-4 resize-none transition-all duration-300
    font-medium placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
    relative z-10
  `;

  const variants = {
    default: `
      border-2 border-gray-200 bg-white
      focus:border-pink-400 focus:ring-pink-300
      hover:border-gray-300
      shadow-sm
      ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-300' : ''}
      ${success ? 'border-green-300 focus:border-green-400 focus:ring-green-300' : ''}
    `,
    glass: `
      border border-white/20 bg-white/10 backdrop-blur-sm
      focus:border-white/40 focus:ring-white/20
      text-white placeholder-white/60
      shadow-lg
    `,
    minimal: `
      border-b-2 border-gray-200 bg-transparent rounded-none p-3 px-0
      focus:border-pink-500 focus:ring-0
      hover:border-gray-300
      ${error ? 'border-red-300' : ''}
      ${success ? 'border-green-300' : ''}
    `,
    filled: `
      border-0 bg-gray-50
      focus:bg-white focus:ring-pink-300 focus:shadow-md
      hover:bg-gray-100
      ${error ? 'bg-red-50 focus:bg-white' : ''}
      ${success ? 'bg-green-50 focus:bg-white' : ''}
    `
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative group">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`
            ${baseStyles}
            ${variants[variant]}
            ${error ? 'animate-shake' : ''}
            ${className}
          `}
          {...props}
        />
        
        {/* Subtle focus glow */}
       <div
  className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-300 
    group-focus-within:ring-4 opacity-0 group-focus-within:opacity-100 z-0
    ${error ? 'ring-red-100' : success ? 'ring-green-100' : 'ring-pink-100'}
  `}
/>
      </div>

      {/* Status messages */}
      {error && (
        <p className="text-red-600 text-sm flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      
      {success && !error && (
        <p className="text-green-600 text-sm flex items-center gap-1">
          <span>✅</span>
          {success}
        </p>
      )}
    </div>
  );
};