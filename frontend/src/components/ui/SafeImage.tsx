import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel?: string;
  fallbackType?: 'placeholder' | 'icon' | 'gradient' | string;
  seed?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  fallbackLabel,
  fallbackType,
  seed,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 ${className ?? ''}`}
      >
        <MapPin className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
        {fallbackLabel && (
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 text-center px-2">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};
