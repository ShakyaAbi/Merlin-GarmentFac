import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`rounded-xl border border-slate-100 bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
};
