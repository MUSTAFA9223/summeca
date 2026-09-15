import type { ReactNode } from 'react';
import { Eye, Layers3 } from 'lucide-react';
import ProductProofPreview from '@/components/catalog/ProductProofPreview';

type Product3DShowcaseProps = {
  name: string;
  thumbnailUrl?: string | null;
  category?: string;
  eyebrow?: string;
  variant?: 'card' | 'hero';
  className?: string;
  badge?: string;
  children?: ReactNode;
};

function categoryLabel(category?: string) {
  if (!category) return 'Digital Product';
  return category.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Product3DShowcase({
  name,
  category,
  eyebrow,
  variant = 'hero',
  className = '',
  badge = 'Actual product preview',
  children,
}: Product3DShowcaseProps) {
  const hero = variant === 'hero';

  return (
    <div
      className={`relative isolate ${hero ? 'min-h-[430px]' : 'h-[225px]'} ${className}`}
      data-product-preview="true"
    >
      <div className="absolute inset-0 rounded-[22px] border border-slate-700/80 bg-[#0c1218] p-3 shadow-[0_26px_70px_rgba(0,0,0,.38)] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            <Layers3 size={11} /> {eyebrow || categoryLabel(category)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Eye size={10} className="text-cyan-300" /> {badge}
          </span>
        </div>
        {children ? (
          <div className={hero ? 'h-[360px] sm:h-[430px]' : 'h-[180px]'}>{children}</div>
        ) : (
          <ProductProofPreview name={name} variant={variant} />
        )}
      </div>
    </div>
  );
}
