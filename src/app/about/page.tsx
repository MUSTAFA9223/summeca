import type { Metadata } from 'next';
import { BrainCircuit, Boxes, ShieldCheck, Sparkles } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'About SUMMECA',
  description: 'Learn about SUMMECA and its focus on practical digital products, AI tools, SaaS applications, and modern work technology.',
};

const pillars = [
  { icon: BrainCircuit, title: 'Useful AI', text: 'AI features should solve real workflow problems, not exist only as decoration.' },
  { icon: Boxes, title: 'Practical digital products', text: 'Tools, SaaS applications, templates, and digital resources built for modern work.' },
  { icon: ShieldCheck, title: 'Secure by design', text: 'Account access, payments, and customer data are treated as core product responsibilities.' },
  { icon: Sparkles, title: 'Clear experience', text: 'We aim for fast, focused interfaces with straightforward pricing and product access.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8 lg:py-24">
            <p className="text-sm font-semibold text-primary">About SUMMECA</p>
            <h1 className="mx-auto mt-2 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Digital tools for smarter modern work</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">SUMMECA is building a focused platform for AI tools, SaaS applications, and high-quality digital products that help people work faster and more effectively.</p>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-5 md:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={21} /></div>
                <h2 className="mt-5 text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
            <h2 className="text-2xl font-bold">Questions about SUMMECA?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">For product, account, partnership, or support questions, contact us at hello@summeca.com.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
