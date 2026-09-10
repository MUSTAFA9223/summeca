'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';
type DiscountType = 'percentage' | 'fixed_amount';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  billing_period: BillingPeriod;
  is_active: boolean;
  sale_price: number | string | null;
  sale_discount_type: DiscountType | null;
  sale_discount_value: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  effective?: { regularPrice: number; finalPrice: number; discountAmount: number; onSale: boolean };
};

type Coupon = {
  id: string;
  code: string;
  coupon_type: DiscountType;
  discount_value: number | string;
  currency: string;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD'];
const emptyPlan = { id: '', name: 'Default', description: '', price: '0', currency: 'USD', billing_period: 'one_time' as BillingPeriod, is_active: true, sale_price: '', sale_discount_type: '' as '' | DiscountType, sale_discount_value: '', sale_starts_at: '', sale_ends_at: '' };
const emptyCoupon = { id: '', code: '', coupon_type: 'percentage' as DiscountType, discount_value: '', currency: 'USD', max_uses: '', valid_from: '', valid_until: '', is_active: true };

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    if (!response.ok) throw new Error(`Request failed (${response.status}). Please try again.`);
    return {};
  }
  try { return JSON.parse(text); } catch {
    throw new Error(response.ok ? 'The server returned an invalid response.' : `Request failed (${response.status}).`);
  }
}

export default function PricingManager({ productId }: { productId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [couponForm, setCouponForm] = useState(emptyCoupon);

  const activeCurrencies = useMemo(
    () => Array.from(new Set(plans.filter((plan) => plan.is_active).map((plan) => plan.currency.toUpperCase()))),
    [plans],
  );

  const preview = useMemo(() => {
    const regular = Number(planForm.price || 0);
    if (!Number.isFinite(regular) || regular < 0) return { final: 0, discount: 0 };
    let final = regular;
    if (planForm.sale_price !== '') {
      const explicit = Number(planForm.sale_price);
      if (Number.isFinite(explicit)) final = Math.max(0, Math.min(regular, explicit));
    } else if (planForm.sale_discount_type && planForm.sale_discount_value !== '') {
      const discount = Number(planForm.sale_discount_value);
      if (Number.isFinite(discount) && discount > 0) {
        final = planForm.sale_discount_type === 'percentage'
          ? regular - regular * Math.min(100, discount) / 100
          : regular - discount;
        final = Math.max(0, Math.min(regular, final));
      }
    }
    return { final: Number(final.toFixed(2)), discount: Number((regular - final).toFixed(2)) };
  }, [planForm]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/pricing`, { cache: 'no-store' });
      const result = await readResponse(response) as { error?: string; plans?: Plan[]; coupons?: Coupon[] };
      if (!response.ok) throw new Error(result.error || 'Failed to load pricing.');
      setPlans(result.plans || []);
      setCoupons(result.coupons || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load pricing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [productId]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/products/${productId}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await readResponse(response) as { error?: string };
    if (!response.ok) throw new Error(result.error || 'Pricing update failed.');
    return result;
  }

  async function savePlan() {
    setSaving(true);
    try {
      await post({
        action: 'save_plan', id: planForm.id || undefined, name: planForm.name,
        description: planForm.description, price: planForm.price, currency: planForm.currency,
        billing_period: planForm.billing_period, is_active: planForm.is_active,
        sale_price: planForm.sale_price === '' ? null : planForm.sale_price,
        sale_discount_type: planForm.sale_price === '' ? (planForm.sale_discount_type || null) : null,
        sale_discount_value: planForm.sale_price === '' && planForm.sale_discount_type ? (planForm.sale_discount_value || null) : null,
        sale_starts_at: planForm.sale_starts_at || null, sale_ends_at: planForm.sale_ends_at || null,
      });
      toast.success(planForm.id ? 'Price updated' : 'Pricing plan added');
      setPlanForm(emptyPlan);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save price.'); }
    finally { setSaving(false); }
  }

  async function saveCoupon() {
    setSaving(true);
    try {
      await post({
        action: 'save_coupon', id: couponForm.id || undefined, code: couponForm.code,
        coupon_type: couponForm.coupon_type, discount_value: couponForm.discount_value,
        currency: couponForm.coupon_type === 'fixed_amount' ? couponForm.currency : undefined,
        max_uses: couponForm.max_uses || null, valid_from: couponForm.valid_from || null,
        valid_until: couponForm.valid_until || null, is_active: couponForm.is_active,
      });
      toast.success(couponForm.id ? 'Coupon updated' : 'Coupon created');
      setCouponForm({ ...emptyCoupon, currency: activeCurrencies[0] || 'USD' });
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save coupon.'); }
    finally { setSaving(false); }
  }

  function editPlan(plan: Plan) {
    setPlanForm({ id: plan.id, name: plan.name, description: plan.description || '', price: String(plan.price), currency: plan.currency || 'USD', billing_period: plan.billing_period, is_active: plan.is_active, sale_price: plan.sale_price === null ? '' : String(plan.sale_price), sale_discount_type: plan.sale_discount_type || '', sale_discount_value: plan.sale_discount_value === null ? '' : String(plan.sale_discount_value), sale_starts_at: toLocalInput(plan.sale_starts_at), sale_ends_at: toLocalInput(plan.sale_ends_at) });
  }

  function editCoupon(coupon: Coupon) {
    setCouponForm({ id: coupon.id, code: coupon.code, coupon_type: coupon.coupon_type, discount_value: String(coupon.discount_value), currency: coupon.currency || activeCurrencies[0] || 'USD', max_uses: coupon.max_uses === null ? '' : String(coupon.max_uses), valid_from: toLocalInput(coupon.valid_from), valid_until: toLocalInput(coupon.valid_until), is_active: coupon.is_active });
  }

  async function runAction(action: string, id: string, extra: Record<string, unknown> = {}) {
    try { await post({ action, id, ...extra }); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Pricing update failed.'); }
  }

  return (
    <div className="mt-6 space-y-6 border-t border-border pt-6">
      <div><h3 className="text-sm font-800 text-foreground">Pricing</h3><p className="mt-1 text-xs text-muted-foreground">Database pricing is the source of truth for product pages, quotes, checkout, and orders.</p></div>

      {loading ? <div className="h-20 rounded-xl shimmer" /> : <div className="space-y-3">{plans.length === 0 ? <p className="text-xs text-muted-foreground">No pricing plans yet.</p> : plans.map((plan) => <div key={plan.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"><div><div className="flex items-center gap-2"><span className="text-sm font-700 text-foreground">{plan.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${plan.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span></div><div className="mt-1 text-xs text-muted-foreground">{plan.effective?.onSale ? <><span className="mr-1 line-through">{money(plan.effective.regularPrice, plan.currency)}</span><span className="font-700 text-success">{money(plan.effective.finalPrice, plan.currency)}</span></> : money(Number(plan.price), plan.currency)} · {plan.billing_period.replace('_', ' ')}</div></div><div className="flex items-center gap-1"><button onClick={() => void runAction('toggle_plan', plan.id, { is_active: !plan.is_active })} className="rounded-lg border border-border px-2 py-1 text-xs">{plan.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => editPlan(plan)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"><Edit2 size={13} /></button><button onClick={() => window.confirm(`Delete pricing plan “${plan.name}”?`) && void runAction('delete_plan', plan.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger/10"><Trash2 size={13} /></button></div></div>)}</div>}

      <section className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between"><h4 className="text-xs font-800 text-foreground">{planForm.id ? 'Edit Pricing Plan' : 'Add Pricing Plan'}</h4>{planForm.id && <button onClick={() => setPlanForm(emptyPlan)} className="text-xs text-primary">New plan</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Plan name" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <select value={planForm.billing_period} onChange={(e) => setPlanForm({ ...planForm, billing_period: e.target.value as BillingPeriod })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="one_time">One-time</option><option value="monthly">Monthly access</option><option value="yearly">Yearly access</option><option value="lifetime">Lifetime</option></select>
          <input type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="Regular price" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <select value={planForm.currency} onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select>
          <input type="number" min="0" step="0.01" value={planForm.sale_price} onChange={(e) => setPlanForm({ ...planForm, sale_price: e.target.value, sale_discount_type: '', sale_discount_value: '' })} placeholder="Sale price (optional)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <select value={planForm.sale_discount_type} disabled={planForm.sale_price !== ''} onChange={(e) => setPlanForm({ ...planForm, sale_discount_type: e.target.value as '' | DiscountType })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"><option value="">Discount type (optional)</option><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select>
          <input type="number" min="0" step="0.01" disabled={!planForm.sale_discount_type || planForm.sale_price !== ''} value={planForm.sale_discount_value} onChange={(e) => setPlanForm({ ...planForm, sale_discount_value: e.target.value })} placeholder="Discount value" className="rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50" />
          <div className="flex items-center rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">Preview: {money(preview.final, planForm.currency)}{preview.discount > 0 ? ` (save ${money(preview.discount, planForm.currency)})` : ''}</div>
          <label className="text-[11px] text-muted-foreground">Sale starts<input type="datetime-local" value={planForm.sale_starts_at} onChange={(e) => setPlanForm({ ...planForm, sale_starts_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="text-[11px] text-muted-foreground">Sale ends<input type="datetime-local" value={planForm.sale_ends_at} onChange={(e) => setPlanForm({ ...planForm, sale_ends_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} />Active pricing plan</label>
        <button onClick={() => void savePlan()} disabled={saving} className="btn-primary flex items-center gap-2"><Check size={13} />{planForm.id ? 'Update Price' : 'Add Pricing Plan'}</button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h4 className="text-xs font-800 text-foreground">Coupons</h4><p className="mt-0.5 text-[11px] text-muted-foreground">Fixed discounts always carry an explicit currency.</p></div><Plus size={14} className="text-muted-foreground" /></div>
        {coupons.map((coupon) => <div key={coupon.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"><div><div className="text-sm font-700 text-foreground">{coupon.code}</div><div className="text-xs text-muted-foreground">{coupon.coupon_type === 'percentage' ? `${coupon.discount_value}%` : money(Number(coupon.discount_value), coupon.currency)} · used {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''}</div></div><div className="flex items-center gap-1"><button onClick={() => void runAction('toggle_coupon', coupon.id, { is_active: !coupon.is_active })} className="rounded-lg border border-border px-2 py-1 text-xs">{coupon.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => editCoupon(coupon)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"><Edit2 size={13} /></button><button onClick={() => window.confirm(`Delete coupon “${coupon.code}”?`) && void runAction('delete_coupon', coupon.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger/10"><Trash2 size={13} /></button></div></div>)}

        <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
          <input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="Coupon code" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <select value={couponForm.coupon_type} onChange={(e) => { const type = e.target.value as DiscountType; setCouponForm({ ...couponForm, coupon_type: type, currency: type === 'fixed_amount' ? (activeCurrencies[0] || couponForm.currency || 'USD') : couponForm.currency }); }} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select>
          <input type="number" min="0" step="0.01" value={couponForm.discount_value} onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })} placeholder="Discount value" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          {couponForm.coupon_type === 'fixed_amount' && <select aria-label="Fixed coupon currency" value={couponForm.currency} onChange={(e) => setCouponForm({ ...couponForm, currency: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">{(activeCurrencies.length ? activeCurrencies : CURRENCIES).map((currency) => <option key={currency}>{currency}</option>)}</select>}
          <input type="number" min="1" step="1" value={couponForm.max_uses} onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })} placeholder="Max uses (optional)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <label className="text-[11px] text-muted-foreground">Valid from<input type="datetime-local" value={couponForm.valid_from} onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="text-[11px] text-muted-foreground">Valid until<input type="datetime-local" value={couponForm.valid_until} onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })} />Active coupon</label>
          <button onClick={() => void saveCoupon()} disabled={saving} className="btn-primary flex items-center justify-center gap-2"><Check size={13} />{couponForm.id ? 'Update Coupon' : 'Create Coupon'}</button>
        </div>
      </section>
    </div>
  );
}
