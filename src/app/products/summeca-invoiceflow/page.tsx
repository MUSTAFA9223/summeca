import type { Metadata } from 'next';
import SaasProductServerPage from '@/app/products/_components/SaasProductServerPage';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'SUMMECA InvoiceFlow | Invoicing Workspace' },
  description:
    'Create professional invoices, manage clients, track payment status, calculate totals and tax, prepare reminders, export records, and save invoices as PDF.',
  alternates: { canonical: '/products/summeca-invoiceflow' },
  openGraph: {
    type: 'website',
    url: '/products/summeca-invoiceflow',
    siteName: 'SUMMECA',
    title: 'SUMMECA InvoiceFlow | Invoicing Workspace',
    description:
      'Create professional invoices, manage clients, track billing, and keep your invoice workflow organized from one workspace.',
    images: [{ url: '/assets/products/invoiceflow.svg', alt: 'SUMMECA InvoiceFlow' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA InvoiceFlow | Invoicing Workspace',
    description:
      'Create professional invoices, manage clients, track billing, and keep your invoice workflow organized from one workspace.',
    images: ['/assets/products/invoiceflow.svg'],
  },
};

export default function InvoiceFlowProductPage() {
  return <SaasProductServerPage slug="summeca-invoiceflow" />;
}
