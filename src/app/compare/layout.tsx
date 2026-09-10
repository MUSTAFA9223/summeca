import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare products',
  description: 'Compare currently published SUMMECA products and active pricing options.',
};

export default function CompareLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
