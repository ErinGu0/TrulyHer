import React from 'react';

export const Button = ({ children, className = '', disabled, onClick, type = 'button', ...props }) => {
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg transition-all duration-300 font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        ${disabled 
          ? 'bg-gray-300 text-gray-500' 
          : 'bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
        }
        centered-text sunset-gradient-text
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};