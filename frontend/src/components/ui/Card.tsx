import React from 'react';

export const Card = ({
  children,
  className = '',
  interactive = false,
  as: Tag = 'div',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  as?: any;
  [key: string]: any;
}) => (
  <Tag
    className={`
      bg-white dark:bg-white/[0.08]
      border border-slate-200/80 dark:border-white/[0.14]
      rounded-card shadow-sm dark:shadow-glass
      backdrop-blur-xl
      transition-colors duration-300
      ${interactive ? 'active:scale-[0.98] hover:dark:bg-white/[0.11] cursor-pointer' : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);

export { Card as GlassCard };
