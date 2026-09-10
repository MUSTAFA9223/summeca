'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Boxes, Headphones, ShieldCheck, UserCheck } from 'lucide-react';

const SplineRobotScene = dynamic(() => import('@/components/ui/SplineRobotScene'), {
  ssr: false,
  loading: () => null,
});

const servicePoints = [
  { icon: ShieldCheck, title: 'Verified Checkout', text: 'Paid access follows provider confirmation' },
  { icon: UserCheck, title: 'Account Delivery', text: 'Orders and eligible access stay tied to your account' },
  { icon: Headphones, title: 'Customer Support', text: 'Help for products, orders, and accounts' },
];

const dark3D =
  '[text-shadow:0_1px_0_#50616a,0_2px_0_#3d4b53,0_3px_0_#2d383f,0_4px_0_#202a30,0_7px_10px_rgba(7,19,25,0.28),-3px_0_10px_rgba(8,197,209,0.18)]';
const cyan3D =
  '[text-shadow:0_1px_0_#35e8f0,0_2px_0_#14cbd5,0_3px_0_#08aeba,0_4px_0_#07838e,0_8px_16px_rgba(8,197,209,0.34),0_0_24px_rgba(8,197,209,0.22)]';

export default function HeroSection() {
  return (
    <section className="relative isolate min-h-[760px] overflow-hidden bg-[#f7f9fa] pt-[68px] md:min-h-screen">
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(108deg,#ffffff_0%,#f7f9fa_53%,#dce8ea_100%)] md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[49%] bg-[radial-gradient(circle_at_20%_43%,#25474e_0%,#183139_42%,#10232a_100%)] [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)] md:block" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white via-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(8,197,209,0.18)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_right,black,transparent_48%)]" />

      <div className="relative z-10 mx-auto grid min-h-[692px] max-w-[1440px] grid-cols-1 items-center md:grid-cols-[45%_55%]">
        <div className="px-6 pb-10 pt-14 sm:px-10 md:px-8 md:pb-16 md:pt-16 lg:px-12 lg:pb-20 lg:pt-20 xl:px-20">
          <div className="mb-7 flex items-center gap-3 text-[11px] font-bold tracking-[0.24em] text-[#667783] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-[#08c5d1] shadow-[0_0_16px_rgba(8,197,209,0.75)]" />
            AI <span className="text-[#08c5d1]">•</span> SAAS <span className="text-[#08c5d1]">•</span> DIGITAL TOOLS
          </div>

          <h1 className="max-w-[720px] uppercase font-black leading-[0.79] tracking-[-0.065em] [perspective:900px]">
            <span className={`block text-[clamp(3.9rem,6.1vw,7rem)] text-[#101820] ${dark3D}`}>THE</span>
            <span className={`mt-2 block text-[clamp(3.35rem,5.35vw,6.2rem)] text-[#101820] ${dark3D}`}>PLATFORM</span>
            <span className={`mt-3 block text-[clamp(2.55rem,4.15vw,4.9rem)] text-[#101820] ${dark3D}`}>FOR SMARTER</span>
            <span className={`mt-3 block bg-gradient-to-b from-[#37e9ef] via-[#08c5d1] to-[#0798a5] bg-clip-text pb-3 text-[clamp(2.7rem,4.45vw,5.2rem)] text-transparent ${cyan3D}`}>DIGITAL WORK</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#667783] sm:text-lg sm:leading-8">
            Discover published AI tools, SaaS products, and digital resources with pricing and availability tied directly to production offers.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/products" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#101820] px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(16,24,32,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#08aeba] hover:shadow-[0_18px_45px_rgba(8,197,209,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08c5d1]">
              Explore Products <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/ai" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#cad5d8] bg-white/75 px-7 py-3.5 text-sm font-bold text-[#152129] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#08c5d1] hover:text-[#0799a5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08c5d1]">
              <Boxes size={16} /> Browse AI Tools
            </Link>
          </div>

          <div className="mt-11 grid max-w-[680px] grid-cols-1 gap-4 border-t border-[#dfe7e9] pt-7 sm:grid-cols-3">
            {servicePoints.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8fbfc] text-[#08aebb]"><Icon size={17} /></span>
                <span><span className="block text-xs font-bold text-[#152129]">{title}</span><span className="mt-1 block text-[11px] leading-4 text-[#71818b]">{text}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] self-stretch overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#23434a_0%,#152b31_48%,#10232a_100%)] md:min-h-[692px] md:overflow-visible md:bg-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_45%,rgba(8,197,209,0.21),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="relative h-full min-h-[520px] w-full touch-pan-y md:min-h-[692px]" aria-hidden="true">
            <div className="absolute inset-[4%] rounded-[50%] border border-[#8eeef3]/10 blur-[0.2px]" />
            <div className="absolute bottom-[-8%] left-[-8%] right-[-8%] top-[-6%] z-10">
              <SplineRobotScene zoomScale={0.84} />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/25 blur-[70px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
