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
  const displaySize = isWordmark ? Math.round(size * 1.16) : size;
  const width = isWordmark ? Math.round(displaySize * 3) : displaySize;
  const logoToneClass = tone === 'light'
    ? 'brightness-0 invert contrast-125'
    : isWordmark
      ? 'brightness-[0.72] contrast-125'
      : '';

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
          className={`flex-shrink-0 select-none object-contain ${logoToneClass}`}
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
