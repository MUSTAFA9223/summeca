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
  const resolvedSrc = src ?? (
    variant === 'wordmark'
      ? '/assets/images/summeca-logo.png'
      : '/assets/images/summeca-mark.png'
  );
  const isWordmark = !src && variant === 'wordmark';
  const width = isWordmark ? Math.round(size * 3) : size;

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
          height={size}
          sizes={`${width}px`}
          className={`flex-shrink-0 object-contain ${tone === 'light' ? 'brightness-0 invert' : ''}`}
          priority
          unoptimized={resolvedSrc.endsWith('.svg')}
        />
      ) : (
        <AppIcon name={iconName} size={size} className="flex-shrink-0" />
      )}
    </div>
  );
});

export default AppLogo;
