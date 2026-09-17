import type { Metadata } from 'next';
import SaasProductServerPage from '@/app/products/_components/SaasProductServerPage';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'SUMMECA LeadFollow AI | Lead Follow-Up Workspace' },
  description:
    'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts from one customer follow-up workspace.',
  alternates: { canonical: '/products/summeca-leadfollow-ai' },
  openGraph: {
    type: 'website',
    url: '/products/summeca-leadfollow-ai',
    siteName: 'SUMMECA',
    title: 'SUMMECA LeadFollow AI | Lead Follow-Up Workspace',
    description:
      'Organize leads, schedule follow-ups, manage pipeline status, and generate AI-assisted outreach drafts from one workspace.',
    images: [{ url: '/assets/products/leadfollow-ai.svg', alt: 'SUMMECA LeadFollow AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA LeadFollow AI | Lead Follow-Up Workspace',
    description:
      'Organize leads, schedule follow-ups, manage pipeline status, and generate AI-assisted outreach drafts from one workspace.',
    images: ['/assets/products/leadfollow-ai.svg'],
  },
};

export default function LeadFollowProductPage() {
  return <SaasProductServerPage slug="summeca-leadfollow-ai" />;
}
