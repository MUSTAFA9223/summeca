'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import AppLogo from '@/components/ui/AppLogo';
import Link from 'next/link';
import { Shield, Download, ArrowLeft } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type AuthView = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');

  const benefits = [
    { icon: Shield, text: 'Secure, private AI processing — your data stays yours' },
    { icon: Download, text: 'Lifetime access to purchased digital products' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/15 blur-3xl"></div>
          <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full bg-accent/15 blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-14">
            <AppLogo size={36} />
            <span className="font-extrabold text-xl text-white">SUMMECA</span>
          </Link>

          <div className="mb-10">
            <h2 className="text-3xl xl:text-4xl font-800 text-white leading-tight mb-4">
              Build smarter.<br />Work faster.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Access premium AI tools, SaaS applications, and digital products — all managed from one powerful dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={`benefit-${text.slice(0, 20)}`} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-extrabold text-lg text-foreground">SUMMECA</span>
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto">
          {view === 'forgot' ? (
            <div>
              <button
                onClick={() => setView('login')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to login
              </button>
              <ForgotPasswordForm />
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex bg-secondary rounded-xl p-1 mb-8">
                <button
                  onClick={() => setView('login')}
                  className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-150 ${
                    view === 'login' ?'bg-card text-foreground shadow-card' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => setView('signup')}
                  className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-150 ${
                    view === 'signup' ?'bg-card text-foreground shadow-card' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
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
      </div>
    </div>
  );
}