import React from 'react';

export const Skeleton = ({ className = '', ...props }: { className?: string; [key: string]: any }) => (
  <div className={`relative overflow-hidden bg-slate-100 dark:bg-white/10 rounded-xl ${className}`} {...props}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-white/[0.08] rounded-2xl p-4 border border-slate-100 dark:border-white/10 shadow-sm dark:shadow-glass space-y-3">
    <Skeleton className="h-40 w-full rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex gap-2 pt-1">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-white/[0.08] rounded-2xl p-3 border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-3">
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
