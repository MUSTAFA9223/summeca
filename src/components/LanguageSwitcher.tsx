'use client';

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export default function LanguageSwitcher({ compact = false, className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const switcherRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const element = switcherRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    element.style.setProperty('--switch-rx', `${(-y * 7).toFixed(2)}deg`);
    element.style.setProperty('--switch-ry', `${(x * 9).toFixed(2)}deg`);
    element.style.setProperty('--glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    const element = switcherRef.current;
    if (!element) return;
    element.style.setProperty('--switch-rx', '0deg');
    element.style.setProperty('--switch-ry', '0deg');
    element.style.setProperty('--glow-x', '50%');
  };

  return (
    <div
      ref={switcherRef}
      data-i18n-skip
      data-language-switcher="true"
      data-active-language={language}
      dir="ltr"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className={`language-switcher-3d ${compact ? 'language-switcher-compact' : ''} ${className}`}
      aria-label="English / العربية"
    >
      <span className="language-switcher-shine" aria-hidden="true" />
      {!compact && (
        <span className="language-globe" aria-hidden="true">
          <Globe2 size={14} />
        </span>
      )}

      <div className="language-track">
        <span className={`language-active-plate ${language === 'ar' ? 'is-ar' : 'is-en'}`} aria-hidden="true" />
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`language-option ${language === 'en' ? 'is-active' : ''}`}
          aria-pressed={language === 'en'}
          title="English"
        >
          <span>EN</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('ar')}
          className={`language-option language-option-ar ${language === 'ar' ? 'is-active' : ''}`}
          aria-pressed={language === 'ar'}
          title="العربية"
        >
          <span>العربية</span>
        </button>
      </div>

      <style jsx>{`
        .language-switcher-3d {
          --switch-rx: 0deg;
          --switch-ry: 0deg;
          --glow-x: 50%;
          --switch-surface: rgba(255, 255, 255, 0.82);
          --switch-border: rgba(15, 23, 42, 0.16);
          --switch-text: #64748b;
          --switch-active-text: #03272b;
          --switch-shadow: 0 9px 24px rgba(15, 23, 42, 0.12);
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border: 1px solid var(--switch-border);
          border-radius: 999px;
          background:
            radial-gradient(circle at var(--glow-x) -10%, rgba(103, 232, 249, 0.24), transparent 43%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.96), var(--switch-surface));
          box-shadow:
            var(--switch-shadow),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px) saturate(145%);
          -webkit-backdrop-filter: blur(18px) saturate(145%);
          transform-style: preserve-3d;
          transform: perspective(720px) rotateX(var(--switch-rx)) rotateY(var(--switch-ry));
          transition:
            transform 180ms cubic-bezier(0.2, 0.75, 0.25, 1),
            box-shadow 220ms ease,
            border-color 220ms ease;
          isolation: isolate;
          will-change: transform;
        }

        .language-switcher-3d:hover {
          border-color: rgba(45, 212, 191, 0.44);
          box-shadow:
            0 13px 32px rgba(15, 23, 42, 0.15),
            0 0 28px rgba(45, 212, 191, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
        }

        .language-switcher-3d:active {
          transform: perspective(720px) rotateX(calc(var(--switch-rx) * 0.45)) rotateY(calc(var(--switch-ry) * 0.45)) scale(0.985);
        }

        .language-switcher-shine {
          position: absolute;
          inset: 1px 8px auto;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.86), transparent);
          opacity: 0.78;
          pointer-events: none;
          transform: translateZ(18px);
        }

        .language-globe {
          position: relative;
          z-index: 3;
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 999px;
          color: #0f9f99;
          background: linear-gradient(145deg, rgba(204, 251, 241, 0.7), rgba(236, 254, 255, 0.48));
          border: 1px solid rgba(45, 212, 191, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transform: translateZ(9px);
        }

        .language-track {
          position: relative;
          z-index: 2;
          display: grid;
          width: 104px;
          height: 32px;
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
          padding: 2px;
          overflow: visible;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.045);
          box-shadow:
            inset 0 1px 3px rgba(15, 23, 42, 0.08),
            inset 0 0 0 1px rgba(15, 23, 42, 0.035);
          transform-style: preserve-3d;
        }

        .language-switcher-compact .language-track {
          width: 96px;
          height: 30px;
        }

        .language-active-plate {
          position: absolute;
          left: 2px;
          top: 2px;
          width: calc(50% - 2px);
          height: calc(100% - 4px);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(240, 253, 250, 0.98), rgba(153, 246, 228, 0.94) 54%, rgba(103, 232, 249, 0.88));
          border: 1px solid rgba(94, 234, 212, 0.72);
          box-shadow:
            0 7px 14px rgba(13, 148, 136, 0.2),
            0 2px 5px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(13, 148, 136, 0.16);
          transform-style: preserve-3d;
          transition: transform 430ms cubic-bezier(0.2, 0.9, 0.2, 1.12), box-shadow 300ms ease;
          pointer-events: none;
        }

        .language-active-plate.is-en {
          transform: translate3d(0, 0, 12px) rotateY(-1.8deg);
        }

        .language-active-plate.is-ar {
          transform: translate3d(100%, 0, 12px) rotateY(1.8deg);
        }

        .language-option {
          position: relative;
          z-index: 4;
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          padding: 0 8px;
          color: var(--switch-text);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.025em;
          line-height: 1;
          cursor: pointer;
          transform: translateZ(15px);
          transition:
            color 220ms ease,
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
            text-shadow 220ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .language-option-ar {
          font-size: 10.5px;
          letter-spacing: 0;
        }

        .language-option:hover {
          color: #0f766e;
          transform: translateZ(19px) translateY(-0.5px);
        }

        .language-option:active {
          transform: translateZ(7px) scale(0.96);
        }

        .language-option:focus-visible {
          outline: 2px solid #22d3ee;
          outline-offset: 2px;
        }

        .language-option.is-active {
          color: var(--switch-active-text);
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .language-option.is-active span {
          animation: language-label-rise 430ms cubic-bezier(0.2, 0.9, 0.2, 1.1) both;
        }

        :global(html[data-site-theme='dark']) .language-switcher-3d {
          --switch-surface: rgba(8, 15, 22, 0.9);
          --switch-border: rgba(148, 163, 184, 0.42);
          --switch-text: rgba(226, 232, 240, 0.52);
          --switch-active-text: #03191c;
          --switch-shadow: 0 11px 28px rgba(0, 0, 0, 0.34);
          background:
            radial-gradient(circle at var(--glow-x) -10%, rgba(34, 211, 238, 0.2), transparent 46%),
            linear-gradient(145deg, rgba(13, 22, 31, 0.98), rgba(3, 9, 14, 0.94));
          box-shadow:
            var(--switch-shadow),
            0 0 0 1px rgba(34, 211, 238, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.44);
        }

        :global(html[data-site-theme='dark']) .language-switcher-3d:hover {
          border-color: rgba(103, 232, 249, 0.55);
          box-shadow:
            0 15px 34px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(34, 211, 238, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        :global(html[data-site-theme='dark']) .language-track {
          background: rgba(0, 0, 0, 0.26);
          box-shadow:
            inset 0 1px 5px rgba(0, 0, 0, 0.48),
            inset 0 0 0 1px rgba(255, 255, 255, 0.035);
        }

        :global(html[data-site-theme='dark']) .language-globe {
          color: #67e8f9;
          background: linear-gradient(145deg, rgba(8, 145, 178, 0.18), rgba(15, 118, 110, 0.12));
          border-color: rgba(103, 232, 249, 0.18);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        :global(html[data-site-theme='dark']) .language-active-plate {
          background:
            linear-gradient(180deg, #bafbf1 0%, #67e8f9 54%, #2dd4bf 100%);
          border-color: rgba(165, 243, 252, 0.78);
          box-shadow:
            0 8px 18px rgba(34, 211, 238, 0.24),
            0 2px 7px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.74),
            inset 0 -1px 0 rgba(13, 148, 136, 0.28);
        }

        :global(html[data-site-theme='dark']) .language-option:hover {
          color: #e6fffb;
          text-shadow: 0 0 12px rgba(103, 232, 249, 0.34);
        }

        @keyframes language-label-rise {
          0% {
            opacity: 0.65;
            transform: translateY(1.5px) scale(0.96);
          }
          68% {
            opacity: 1;
            transform: translateY(-0.6px) scale(1.025);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .language-switcher-3d,
          .language-active-plate,
          .language-option,
          .language-option.is-active span {
            animation: none !important;
            transition-duration: 0.01ms !important;
          }

          .language-switcher-3d,
          .language-switcher-3d:hover,
          .language-switcher-3d:active {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
