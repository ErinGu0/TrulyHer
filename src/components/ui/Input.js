import React from 'react';

export const Input = ({ value, onChange, placeholder, className = '', type = 'text', ...props }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`
        w-full border border-gray-300 rounded-lg p-3
        focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
        transition-all duration-200
        centered-text
        ${className}
      `}
      {...props}
    />
  );
};