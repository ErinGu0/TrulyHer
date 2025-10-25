import React from 'react';

export const Textarea = ({ value, onChange, placeholder, className = '', rows = 4, ...props }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`
        w-full border border-gray-300 rounded-lg p-4 resize-none
        focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
        transition-all duration-200 font-medium
        centered-text
        ${className}
      `}
      {...props}
    />
  );
};