'use client';

import React, { memo, useMemo } from 'react';
import AppIcon from './AppIcon';
import AppImage from './AppImage';

type LogoVariant = 'mark' | 'wordmark';
type LogoTone = 'default' | 'light';

interface AppLogoProps {
  src?: string;
  iconName?: string;
  size?: number;
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  onClick?: () => void;
}

const AppLogo = memo(function AppLogo({
  src,
  iconName = 'SparklesIcon',
  size = 64,
  variant = 'mark',
  tone = 'default',
  className = '',
  onClick,
}: AppLogoProps) {
  const isBrandAsset = !src;
  const resolvedSrc = src ?? (
    variant === 'wordmark'
      ? '/assets/images/summeca-logo.png'
      : '/assets/images/summeca-mark.png'
  );
  const isWordmark = isBrandAsset && variant === 'wordmark';
  const displaySize = isWordmark ? Math.round(size * 1.16) : size;
  const width = isWordmark ? Math.round(displaySize * 3) : displaySize;
  const logoFilter = isBrandAsset
    ? tone === 'light'
      ? 'brightness(0) saturate(100%) invert(84%) sepia(54%) saturate(1040%) hue-rotate(119deg) brightness(102%) contrast(95%) drop-shadow(0 0 9px rgba(45, 212, 191, 0.42))'
      : 'brightness(0) saturate(100%) invert(67%) sepia(89%) saturate(1230%) hue-rotate(128deg) brightness(91%) contrast(96%) drop-shadow(0 0 6px rgba(8, 197, 209, 0.28))'
    : undefined;

  const containerClassName = useMemo(() => {
    const classes = ['inline-flex items-center shrink-0'];
    if (onClick) classes.push('cursor-pointer hover:opacity-80 transition-opacity');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [onClick, className]);

  return (
    <div className={containerClassName} onClick={onClick}>
      {resolvedSrc ? (
        <AppImage
          src={resolvedSrc}
          alt={variant === 'wordmark' ? 'SUMMECA' : 'SUMMECA logo'}
          width={width}
          height={displaySize}
          sizes={`${width}px`}
          quality={100}
          draggable={false}
          className="flex-shrink-0 select-none object-contain"
          style={logoFilter ? { filter: logoFilter } : undefined}
          priority
          unoptimized={resolvedSrc.endsWith('.svg')}
        />
      ) : (
        <AppIcon name={iconName} size={displaySize} className="flex-shrink-0" />
      )}
    </div>
  );
});

export default AppLogo;
