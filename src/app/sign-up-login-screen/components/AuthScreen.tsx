'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import AppLogo from '@/components/ui/AppLogo';
import SplineRobotScene from '@/components/ui/SplineRobotScene';

type AuthView = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');
  const headlineLine = 'block w-fit bg-gradient-to-r from-white from-[0%] via-teal-50 via-[52%] to-teal-300 bg-clip-text text-transparent';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050807] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(20,184,166,0.16),transparent_30%),radial-gradient(circle_at_78%_76%,rgba(45,212,191,0.10),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="SUMMECA home">
          <AppLogo size={34} />
          <span className="text-lg font-extrabold tracking-[0.14em] text-white">SUMMECA</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl transition hover:border-teal-300/30 hover:text-white">
          <ArrowLeft size={14} />
          Back home
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-4 px-5 pb-8 pt-24 sm:px-8 lg:grid-cols-[1.12fr_.88fr] lg:gap-8 lg:px-12 lg:pb-10 lg:pt-20">
        <section className="relative hidden h-[min(82vh,820px)] min-h-[620px] lg:block">
          <div className="absolute inset-[4%] rounded-[3rem] border border-white/[0.07] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_40px_120px_rgba(0,0,0,.35)] backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute left-[8%] top-[10%] z-20 max-w-md">
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
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/48 xl:text-base">
              Sign in to access your SUMMECA tools, products and workspace from one secure place.
            </p>
          </div>

          <div className="absolute inset-x-[-4%] bottom-[-4%] top-[22%] z-10">
            <SplineRobotScene />
          </div>
          <div className="pointer-events-none absolute bottom-[7%] left-[13%] right-[13%] h-16 rounded-[50%] bg-teal-300/10 blur-3xl" />
        </section>

        <section className="relative mx-auto flex w-full max-w-[510px] items-center justify-center py-6 lg:py-0">
          <div className="absolute -inset-12 -z-10 rounded-full bg-teal-400/[0.06] blur-3xl" />
          <div className="w-full rounded-[2rem] border border-white/[0.09] bg-[#0b0f0e]/80 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-8">
            <div className="mb-7 lg:hidden">
              <div className="relative mx-auto mb-4 h-36 w-full max-w-xs overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02]">
                <SplineRobotScene />
              </div>
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-300/80">Welcome to SUMMECA</p>
            </div>

            {view === 'forgot' ? (
              <div>
                <button onClick={() => setView('login')} className="mb-6 flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
                  <ArrowLeft size={14} /> Back to login
                </button>
                <ForgotPasswordForm />
              </div>
            ) : (
              <>
                <div className="mb-8 flex rounded-2xl border border-white/[0.06] bg-black/30 p-1.5">
                  <button onClick={() => setView('login')} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${view === 'login' ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:text-white'}`}>
                    Log in
                  </button>
                  <button onClick={() => setView('signup')} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${view === 'signup' ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:text-white'}`}>
                    Sign up
                  </button>
                </div>
                {view === 'login' ? (
                  <LoginForm onForgotPassword={() => setView('forgot')} onSwitchToSignup={() => setView('signup')} />
                ) : (
                  <SignupForm onSwitchToLogin={() => setView('login')} />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
