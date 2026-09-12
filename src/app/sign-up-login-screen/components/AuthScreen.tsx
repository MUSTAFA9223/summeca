'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import AppLogo from '@/components/ui/AppLogo';

type AuthView = 'login' | 'signup' | 'forgot';
type TransitionDirection = 'left' | 'right' | null;

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>(null);
  const headlineLine = 'block w-fit bg-gradient-to-r from-white from-[0%] via-teal-50 via-[52%] to-teal-300 bg-clip-text text-transparent';

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
    <main className="relative min-h-screen overflow-hidden bg-[#050807] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(20,184,166,0.16),transparent_30%),radial-gradient(circle_at_78%_76%,rgba(45,212,191,0.10),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="SUMMECA home">
          <AppLogo variant="wordmark" tone="light" size={46} />
        </Link>
        <Link href="/" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl transition hover:border-teal-300/30 hover:text-white">
          <ArrowLeft size={14} />
          Back home
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-4 px-5 pb-8 pt-24 sm:px-8 lg:grid-cols-[1.12fr_.88fr] lg:gap-8 lg:px-12 lg:pb-10 lg:pt-20">
        <section className="relative hidden h-[min(82vh,820px)] min-h-[620px] lg:block">
          <div className="absolute inset-[4%] rounded-[3rem] border border-white/[0.07] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_40px_120px_rgba(0,0,0,.35)] backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute left-[8%] top-[12%] z-20 max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">
              <Sparkles size={13} /> Interactive workspace
            </div>
            <h1 className="text-4xl font-black leading-[1.04] tracking-[-0.04em] xl:text-6xl">
              <span className={headlineLine}>Your digital</span>
              <span className={headlineLine}>world,</span>
              <span className={headlineLine}>ready</span>
              <span className={headlineLine}>when you</span>
              <span className={headlineLine}>are.</span>
            </h1>
            <p className="mt-14 max-w-[360px] pr-5 text-[15px] font-medium leading-7 text-teal-200 xl:mt-16 xl:text-[17px]">
              Sign in to access your SUMMECA tools, products and workspace from one secure place.
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-[12%] left-[8%] h-44 w-44 rounded-full border border-teal-300/10 bg-teal-300/[0.025] blur-[1px]" />
          <div className="pointer-events-none absolute bottom-[18%] right-[12%] h-72 w-72 rounded-full bg-teal-300/[0.045] blur-3xl" />
        </section>

        <section className="relative mx-auto flex w-full max-w-[510px] items-center justify-center py-6 lg:py-0">
          <div className="absolute -inset-12 -z-10 rounded-full bg-teal-400/[0.06] blur-3xl" />
          <div className="w-full rounded-[2rem] border border-white/[0.09] bg-[#0b0f0e]/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-8">
            <div className="mb-7 lg:hidden">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-300/80">Welcome to SUMMECA</p>
            </div>

            {view === 'forgot' ? (
              <div>
                <button onClick={showLogin} className="mb-6 flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
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
                  <div className="mb-8 flex rounded-2xl border border-white/[0.06] bg-black/30 p-1.5">
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

                {transitionDirection && (
                  <div
                    key={`auth-sweep-${view}`}
                    aria-hidden="true"
                    className={`auth-transition-sweep ${transitionDirection === 'left' ? 'auth-sweep-left' : 'auth-sweep-right'}`}
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .auth-switch-stage {
          position: relative;
          perspective: 1500px;
          transform-style: preserve-3d;
          isolation: isolate;
        }

        .auth-switch-content {
          position: relative;
          z-index: 1;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity, filter;
        }

        .auth-content-left {
          animation: auth-content-left 760ms cubic-bezier(0.2, 0.74, 0.2, 1) both;
          transform-origin: right center;
        }

        .auth-content-right {
          animation: auth-content-right 760ms cubic-bezier(0.2, 0.74, 0.2, 1) both;
          transform-origin: left center;
        }

        .auth-transition-sweep {
          position: absolute;
          inset: -6px;
          z-index: 2;
          pointer-events: none;
          border-radius: 1.6rem;
          background: linear-gradient(
            120deg,
            rgba(5, 8, 7, 0.12) 0%,
            rgba(13, 148, 136, 0.72) 38%,
            rgba(45, 212, 191, 0.46) 58%,
            rgba(5, 8, 7, 0.08) 100%
          );
          box-shadow:
            0 0 70px rgba(45, 212, 191, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          opacity: 0;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        .auth-sweep-left {
          animation: auth-sweep-left 760ms cubic-bezier(0.2, 0.74, 0.2, 1) both;
          transform-origin: right center;
        }

        .auth-sweep-right {
          animation: auth-sweep-right 760ms cubic-bezier(0.2, 0.74, 0.2, 1) both;
          transform-origin: left center;
        }

        @keyframes auth-content-left {
          0% {
            opacity: 0.48;
            transform: translate3d(24px, 0, -70px) rotateY(5deg) scale(0.985);
            filter: blur(2px);
          }
          45% {
            opacity: 0.82;
            transform: translate3d(8px, 0, -24px) rotateY(2deg) scale(0.994);
            filter: blur(0.7px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
            filter: blur(0);
          }
        }

        @keyframes auth-content-right {
          0% {
            opacity: 0.48;
            transform: translate3d(-24px, 0, -70px) rotateY(-5deg) scale(0.985);
            filter: blur(2px);
          }
          45% {
            opacity: 0.82;
            transform: translate3d(-8px, 0, -24px) rotateY(-2deg) scale(0.994);
            filter: blur(0.7px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
            filter: blur(0);
          }
        }

        @keyframes auth-sweep-left {
          0% {
            opacity: 0;
            transform: translate3d(108%, 0, 12px) rotateY(0deg);
          }
          16% {
            opacity: 0.88;
          }
          50% {
            opacity: 0.72;
            transform: translate3d(0, 0, 28px) rotateY(-7deg);
          }
          84% {
            opacity: 0.42;
          }
          100% {
            opacity: 0;
            transform: translate3d(-108%, 0, 12px) rotateY(-2deg);
          }
        }

        @keyframes auth-sweep-right {
          0% {
            opacity: 0;
            transform: translate3d(-108%, 0, 12px) rotateY(0deg);
          }
          16% {
            opacity: 0.88;
          }
          50% {
            opacity: 0.72;
            transform: translate3d(0, 0, 28px) rotateY(7deg);
          }
          84% {
            opacity: 0.42;
          }
          100% {
            opacity: 0;
            transform: translate3d(108%, 0, 12px) rotateY(2deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-content-left,
          .auth-content-right {
            animation: none;
          }

          .auth-transition-sweep {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
