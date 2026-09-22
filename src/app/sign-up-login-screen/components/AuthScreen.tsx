'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import AppLogo from '@/components/ui/AppLogo';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';

type AuthView = 'login' | 'signup' | 'forgot';
type TransitionDirection = 'left' | 'right' | null;

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>(null);
  const headlineLine = 'summeca-auth-headline-line block w-fit bg-gradient-to-r from-white from-[0%] via-teal-50 via-[52%] to-teal-300 bg-clip-text text-transparent';

  const showLogin = () => {
    if (view === 'login') return;
    setTransitionDirection(view === 'signup' ? 'right' : null);
    setView('login');
  };

  const showSignup = () => {
    if (view === 'signup') return;
    setTransitionDirection('left');
    setView('signup');
  };

  const showForgotPassword = () => {
    setTransitionDirection(null);
    setView('forgot');
  };

  return (
    <main className="summeca-auth-shell relative min-h-screen overflow-hidden bg-[#050807] text-white">
      <div className="summeca-auth-ambient pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(20,184,166,0.16),transparent_30%),radial-gradient(circle_at_78%_76%,rgba(45,212,191,0.10),transparent_32%)]" />
      <div className="summeca-auth-grid pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="SUMMECA home">
          <AppLogo variant="wordmark" size={50} />
        </Link>
        <Link href="/" className="summeca-auth-back-home flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl transition hover:border-teal-300/30 hover:text-white">
          <ArrowLeft size={14} />
          Back home
        </Link>
      </header>

      <div className={`auth-layout relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-4 px-5 pb-8 pt-24 sm:px-8 lg:gap-8 lg:px-12 lg:pb-10 lg:pt-20 ${view === 'signup' ? 'auth-layout-signup' : 'auth-layout-login'}`}>
        <section className={`summeca-auth-feature-panel relative hidden h-[min(82vh,820px)] min-h-[620px] overflow-hidden lg:block ${transitionDirection === 'left' ? 'auth-feature-left' : transitionDirection === 'right' ? 'auth-feature-right' : ''}`}>
          <div className="summeca-auth-feature-surface absolute inset-[4%] rounded-[2rem] border border-white/[0.07] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_40px_120px_rgba(0,0,0,.35)] backdrop-blur-[2px]" />
          <div className="absolute left-[8%] right-[5%] top-[10%] z-20 max-w-lg">
            <div className="summeca-auth-badge mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">
              <Sparkles size={13} /> Your purchased tools
            </div>
            <h1 className="text-4xl font-black leading-[1.02] tracking-[-0.04em] xl:text-5xl">
              <span className={headlineLine}>Real tools.</span>
              <span className={headlineLine}>One secure</span>
              <span className={headlineLine}>workspace.</span>
            </h1>
            <p className="summeca-auth-copy mt-5 max-w-[430px] pr-5 text-[15px] font-medium leading-7 text-slate-300 xl:text-[16px]">
              Sign in to access your SUMMECA tools, products and workspace from one secure place.
            </p>
          </div>
          <WorkspaceOverviewPreview className="absolute bottom-[8%] left-[8%] right-[5%] z-20" />
        </section>

        <section className={`auth-form-panel relative mx-auto flex w-full max-w-[510px] flex-col items-center justify-center py-6 lg:py-0 ${transitionDirection === 'left' ? 'auth-panel-left' : transitionDirection === 'right' ? 'auth-panel-right' : ''}`}>
          <div className="absolute -inset-12 -z-10 rounded-full bg-teal-400/[0.06] blur-3xl" />
          <div className="mb-4 grid w-full grid-cols-3 gap-2 lg:hidden">
            {['InvoiceFlow', 'LeadFollow AI', 'Secure downloads'].map((label) => (
              <div key={label} className="summeca-auth-chip border border-white/[0.08] bg-white/[0.025] px-2 py-3 text-center text-[10px] font-bold text-teal-100">
                {label}
              </div>
            ))}
          </div>
          <div className="summeca-auth-card w-full rounded-[2rem] border border-white/[0.09] bg-[#0b0f0e]/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-lg sm:p-8 sm:backdrop-blur-2xl">
            <div className="mb-7 lg:hidden">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-300/80">Welcome to SUMMECA</p>
            </div>

            {view === 'forgot' ? (
              <div>
                <button onClick={showLogin} className="summeca-auth-back-link mb-6 flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
                  <ArrowLeft size={14} /> Back to login
                </button>
                <ForgotPasswordForm />
              </div>
            ) : (
              <div className="auth-switch-stage">
                <div
                  key={view}
                  className={`auth-switch-content ${transitionDirection === 'left' ? 'auth-content-left' : transitionDirection === 'right' ? 'auth-content-right' : ''}`}
                >
                  <div className="summeca-auth-tabs mb-8 flex rounded-2xl border border-white/[0.06] bg-black/30 p-1.5">
                    <button onClick={showLogin} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${view === 'login' ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:text-white'}`}>
                      Log in
                    </button>
                    <button onClick={showSignup} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${view === 'signup' ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:text-white'}`}>
                      Sign up
                    </button>
                  </div>
                  {view === 'login' ? (
                    <LoginForm onForgotPassword={showForgotPassword} onSwitchToSignup={showSignup} />
                  ) : (
                    <SignupForm onSwitchToLogin={showLogin} />
                  )}
                </div>

              </div>
            )}
          </div>
        </section>

        {transitionDirection && view !== 'forgot' && (
          <div
            key={`auth-layout-sweep-${view}`}
            aria-hidden="true"
            className={`auth-layout-transition-sweep ${transitionDirection === 'left' ? 'auth-layout-sweep-left' : 'auth-layout-sweep-right'}`}
          />
        )}
      </div>

      <style jsx>{`

        .auth-layout {
          perspective: 1800px;
          transform-style: preserve-3d;
          isolation: isolate;
        }

        .auth-layout-login {
          grid-template-columns: 1.12fr 0.88fr;
        }

        .auth-layout-signup {
          grid-template-columns: 0.88fr 1.12fr;
        }

        .auth-layout-login .summeca-auth-feature-panel {
          grid-column: 1;
        }

        .auth-layout-login .auth-form-panel {
          grid-column: 2;
        }

        .auth-layout-signup .auth-form-panel {
          grid-column: 1;
        }

        .auth-layout-signup .summeca-auth-feature-panel {
          grid-column: 2;
        }

        .auth-form-panel,
        .summeca-auth-feature-panel {
          grid-row: 1;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        .auth-panel-left {
          animation: auth-panel-to-left 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: center center;
        }

        .auth-panel-right {
          animation: auth-panel-to-right 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: center center;
        }

        .auth-feature-left {
          animation: auth-feature-to-right 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: center center;
        }

        .auth-feature-right {
          animation: auth-feature-to-left 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: center center;
        }

        .auth-layout-transition-sweep {
          position: absolute;
          top: 15%;
          bottom: 10%;
          left: 28%;
          z-index: 25;
          width: 44%;
          pointer-events: none;
          opacity: 0;
          border: 1px solid rgba(153, 246, 228, 0.10);
          background:
            radial-gradient(circle at 78% 20%, rgba(255,255,255,0.08), transparent 28%),
            linear-gradient(135deg, rgba(13,148,136,0.24), rgba(20,184,166,0.20) 52%, rgba(45,212,191,0.16));
          clip-path: polygon(16% 0, 100% 0, 84% 100%, 0 100%);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.16),
            0 0 54px rgba(45, 212, 191, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.10);
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity, clip-path;
        }

        .auth-layout-transition-sweep::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(112deg, transparent 25%, rgba(255,255,255,0.06) 47%, transparent 70%),
            radial-gradient(circle at 78% 26%, rgba(255,255,255,0.06), transparent 20%);
          mix-blend-mode: screen;
        }

        .auth-layout-sweep-left {
          animation: auth-layout-sweep-left 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
        }

        .auth-layout-sweep-right {
          animation: auth-layout-sweep-right 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
        }

        @keyframes auth-panel-to-left {
          0% {
            opacity: 0.82;
            transform: translate3d(118%, 0, -84px) rotateY(-5deg) scale(0.985);
          }
          55% {
            opacity: 1;
            transform: translate3d(-7%, 0, 18px) rotateY(1deg) scale(1.006);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @keyframes auth-panel-to-right {
          0% {
            opacity: 0.82;
            transform: translate3d(-118%, 0, -84px) rotateY(5deg) scale(0.985);
          }
          55% {
            opacity: 1;
            transform: translate3d(7%, 0, 18px) rotateY(-1deg) scale(1.006);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @keyframes auth-feature-to-right {
          0% {
            opacity: 0.84;
            transform: translate3d(-82%, 0, -64px) rotateY(4deg) scale(0.988);
          }
          55% {
            opacity: 1;
            transform: translate3d(5%, 0, 12px) rotateY(-0.8deg) scale(1.004);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @keyframes auth-feature-to-left {
          0% {
            opacity: 0.84;
            transform: translate3d(82%, 0, -64px) rotateY(-4deg) scale(0.988);
          }
          55% {
            opacity: 1;
            transform: translate3d(-5%, 0, 12px) rotateY(0.8deg) scale(1.004);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @keyframes auth-layout-sweep-left {
          0% {
            opacity: 0;
            transform: translate3d(128%, 0, 40px) rotateY(0deg);
            clip-path: polygon(16% 0, 100% 0, 84% 100%, 0 100%);
          }
          12% {
            opacity: 0.28;
          }
          50% {
            opacity: 0.22;
            transform: translate3d(0, 0, 64px) rotateY(-6deg);
            clip-path: polygon(0 0, 84% 0, 100% 100%, 16% 100%);
          }
          88% {
            opacity: 0.12;
          }
          100% {
            opacity: 0;
            transform: translate3d(-128%, 0, 40px) rotateY(-2deg);
            clip-path: polygon(16% 0, 100% 0, 84% 100%, 0 100%);
          }
        }

        @keyframes auth-layout-sweep-right {
          0% {
            opacity: 0;
            transform: translate3d(-128%, 0, 40px) rotateY(0deg);
            clip-path: polygon(0 0, 84% 0, 100% 100%, 16% 100%);
          }
          12% {
            opacity: 0.28;
          }
          50% {
            opacity: 0.22;
            transform: translate3d(0, 0, 64px) rotateY(6deg);
            clip-path: polygon(16% 0, 100% 0, 84% 100%, 0 100%);
          }
          88% {
            opacity: 0.12;
          }
          100% {
            opacity: 0;
            transform: translate3d(128%, 0, 40px) rotateY(2deg);
            clip-path: polygon(0 0, 84% 0, 100% 100%, 16% 100%);
          }
        }

        @media (max-width: 1023px) {
          .auth-layout-login,
          .auth-layout-signup {
            grid-template-columns: minmax(0, 1fr);
          }

          .auth-layout-login .auth-form-panel,
          .auth-layout-signup .auth-form-panel {
            grid-column: 1;
          }

          .auth-panel-left,
          .auth-panel-right {
            animation-duration: 720ms;
          }

          .auth-layout-transition-sweep {
            display: none;
          }
        }

        .auth-switch-stage {
          position: relative;
          perspective: 1500px;
          transform-style: preserve-3d;
          isolation: isolate;
          overflow: hidden;
          border-radius: 1.6rem;
        }

        .auth-switch-content {
          position: relative;
          z-index: 1;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        .auth-content-left {
          animation: auth-content-left 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: right center;
        }

        .auth-content-right {
          animation: auth-content-right 900ms cubic-bezier(0.77, 0, 0.18, 1) both;
          transform-origin: left center;
        }

        @keyframes auth-content-left {
          0% {
            opacity: 0.38;
            transform: translate3d(28px, 0, -64px) rotateY(5deg) scale(0.986);
          }
          52% {
            opacity: 0.82;
            transform: translate3d(8px, 0, -18px) rotateY(1.5deg) scale(0.996);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @keyframes auth-content-right {
          0% {
            opacity: 0.38;
            transform: translate3d(-28px, 0, -64px) rotateY(-5deg) scale(0.986);
          }
          52% {
            opacity: 0.82;
            transform: translate3d(-8px, 0, -18px) rotateY(-1.5deg) scale(0.996);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-content-left,
          .auth-content-right,
          .auth-panel-left,
          .auth-panel-right,
          .auth-feature-left,
          .auth-feature-right {
            animation: none;
          }

          .auth-layout-transition-sweep {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
