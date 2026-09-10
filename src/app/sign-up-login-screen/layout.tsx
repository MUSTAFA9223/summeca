import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in or create account',
  description: 'Sign in to your SUMMECA account or create a new account.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
