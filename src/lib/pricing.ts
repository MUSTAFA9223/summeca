export interface SalePricingInput {
  price: number | string;
  sale_price?: number | string | null;
  sale_discount_type?: 'percentage' | 'fixed_amount' | string | null;
  sale_discount_value?: number | string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
}

export interface EffectivePrice {
  regularPrice: number;
  salePrice: number | null;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  onSale: boolean;
}

export function getEffectivePrice(plan: SalePricingInput, now = new Date()): EffectivePrice {
  const regularPrice = Number(plan.price);
  if (!Number.isFinite(regularPrice) || regularPrice < 0) {
    throw new Error('Invalid regular price.');
  }

  const startsAt = plan.sale_starts_at ? new Date(plan.sale_starts_at) : null;
  const endsAt = plan.sale_ends_at ? new Date(plan.sale_ends_at) : null;
  const withinWindow = (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);

  let candidate: number | null = null;
  if (plan.sale_price !== null && plan.sale_price !== undefined && plan.sale_price !== '') {
    const explicitSale = Number(plan.sale_price);
    if (Number.isFinite(explicitSale) && explicitSale >= 0 && explicitSale <= regularPrice) {
      candidate = explicitSale;
    }
  } else if (plan.sale_discount_value !== null && plan.sale_discount_value !== undefined) {
    const value = Number(plan.sale_discount_value);
    if (Number.isFinite(value) && value > 0) {
      if (plan.sale_discount_type === 'percentage' && value <= 100) {
        candidate = regularPrice - (regularPrice * value) / 100;
      } else if (plan.sale_discount_type === 'fixed_amount') {
        candidate = regularPrice - value;
      }
    }
  }

  if (candidate !== null) candidate = Math.max(0, Math.min(regularPrice, candidate));
  const onSale = withinWindow && candidate !== null && candidate < regularPrice;
  const finalPrice = Number((onSale ? candidate! : regularPrice).toFixed(2));
  const discountAmount = Number((regularPrice - finalPrice).toFixed(2));
  const discountPercent = regularPrice > 0
    ? Number(((discountAmount / regularPrice) * 100).toFixed(2))
    : 0;

  return {
    regularPrice: Number(regularPrice.toFixed(2)),
    salePrice: onSale ? finalPrice : null,
    finalPrice,
    discountAmount,
    discountPercent,
    onSale,
  };
}
