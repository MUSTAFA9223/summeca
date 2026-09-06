'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Edit2, Plus, Trash2 } from 'lucide-react';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';
type DiscountType = 'percentage' | 'fixed_amount';

interface Plan {
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
  effective?: {
    regularPrice: number;
    salePrice: number | null;
    finalPrice: number;
    discountAmount: number;
    discountPercent: number;
    onSale: boolean;
  };
}

interface Coupon {
  id: string;
  code: string;
  coupon_type: DiscountType;
  discount_value: number | string;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

const emptyPlan = {
  id: '',
  name: 'Default',
  description: '',
  price: '0',
  currency: 'USD',
  billing_period: 'one_time' as BillingPeriod,
  is_active: true,
  sale_price: '',
  sale_discount_type: '' as '' | DiscountType,
  sale_discount_value: '',
  sale_starts_at: '',
  sale_ends_at: '',
};

const emptyCoupon = {
  id: '',
  code: '',
  coupon_type: 'percentage' as DiscountType,
  discount_value: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function PricingManager({ productId }: { productId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [couponForm, setCouponForm] = useState(emptyCoupon);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load pricing.');
      setPlans(data.plans ?? []);
      setCoupons(data.coupons ?? []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load pricing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [productId]);

  const preview = useMemo(() => {
    const regular = Number(planForm.price || 0);
    if (!Number.isFinite(regular) || regular < 0) return { final: 0, discount: 0 };
    let final = regular;
    const explicitSale = planForm.sale_price === '' ? null : Number(planForm.sale_price);
    if (explicitSale !== null && Number.isFinite(explicitSale)) {
      final = Math.max(0, Math.min(regular, explicitSale));
    } else if (planForm.sale_discount_value !== '' && planForm.sale_discount_type) {
      const value = Number(planForm.sale_discount_value);
      if (Number.isFinite(value) && value > 0) {
        final = planForm.sale_discount_type === 'percentage'
          ? regular - (regular * Math.min(100, value)) / 100
          : regular - value;
        final = Math.max(0, Math.min(regular, final));
      }
    }
    return { final: Number(final.toFixed(2)), discount: Number((regular - final).toFixed(2)) };
  }, [planForm]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/products/${productId}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Pricing update failed.');
    return data;
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      await post({
        action: 'save_plan',
        id: planForm.id || undefined,
        name: planForm.name,
        description: planForm.description,
        price: planForm.price,
        currency: planForm.currency,
        billing_period: planForm.billing_period,
        is_active: planForm.is_active,
        sale_price: planForm.sale_price === '' ? null : planForm.sale_price,
        sale_discount_type: planForm.sale_price === '' ? (planForm.sale_discount_type || null) : null,
        sale_discount_value: planForm.sale_price === '' && planForm.sale_discount_type ? (planForm.sale_discount_value || null) : null,
        sale_starts_at: planForm.sale_starts_at || null,
        sale_ends_at: planForm.sale_ends_at || null,
      });
      toast.success(planForm.id ? 'Price updated' : 'Pricing plan added');
      setPlanForm(emptyPlan);
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save price.');
    } finally {
      setSaving(false);
    }
  };

  const editPlan = (plan: Plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? '',
      price: String(plan.price),
      currency: plan.currency || 'USD',
      billing_period: plan.billing_period,
      is_active: plan.is_active,
      sale_price: plan.sale_price === null ? '' : String(plan.sale_price),
      sale_discount_type: plan.sale_discount_type ?? '',
      sale_discount_value: plan.sale_discount_value === null ? '' : String(plan.sale_discount_value),
      sale_starts_at: toLocalInput(plan.sale_starts_at),
      sale_ends_at: toLocalInput(plan.sale_ends_at),
    });
  };

  const togglePlan = async (plan: Plan) => {
    try {
      await post({ action: 'toggle_plan', id: plan.id, is_active: !plan.is_active });
      await load();
    } catch (error: any) { toast.error(error?.message || 'Could not update plan.'); }
  };

  const deletePlan = async (plan: Plan) => {
    if (!window.confirm(`Delete pricing plan “${plan.name}”?`)) return;
    try {
      await post({ action: 'delete_plan', id: plan.id });
      toast.success('Pricing plan deleted');
      await load();
    } catch (error: any) { toast.error(error?.message || 'Could not delete plan.'); }
  };

  const saveCoupon = async () => {
    setSaving(true);
    try {
      await post({
        action: 'save_coupon',
        id: couponForm.id || undefined,
        code: couponForm.code,
        coupon_type: couponForm.coupon_type,
        discount_value: couponForm.discount_value,
        max_uses: couponForm.max_uses || null,
        valid_from: couponForm.valid_from || null,
        valid_until: couponForm.valid_until || null,
        is_active: couponForm.is_active,
      });
      toast.success(couponForm.id ? 'Coupon updated' : 'Coupon created');
      setCouponForm(emptyCoupon);
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon: Coupon) => {
    setCouponForm({
      id: coupon.id,
      code: coupon.code,
      coupon_type: coupon.coupon_type,
      discount_value: String(coupon.discount_value),
      max_uses: coupon.max_uses === null ? '' : String(coupon.max_uses),
      valid_from: toLocalInput(coupon.valid_from),
      valid_until: toLocalInput(coupon.valid_until),
      is_active: coupon.is_active,
    });
  };

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      await post({ action: 'toggle_coupon', id: coupon.id, is_active: !coupon.is_active });
      await load();
    } catch (error: any) { toast.error(error?.message || 'Could not update coupon.'); }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon “${coupon.code}”?`)) return;
    try {
      await post({ action: 'delete_coupon', id: coupon.id });
      toast.success('Coupon deleted');
      await load();
    } catch (error: any) { toast.error(error?.message || 'Could not delete coupon.'); }
  };

  return (
    <div className="mt-6 pt-6 border-t border-border space-y-6">
      <div>
        <h3 className="text-sm font-800 text-foreground">Pricing</h3>
        <p className="text-xs text-muted-foreground mt-1">Prices saved here are the database source of truth for the storefront and checkout.</p>
      </div>

      {loading ? <div className="h-20 rounded-xl shimmer" /> : (
        <div className="space-y-3">
          {plans.length === 0 ? <p className="text-xs text-muted-foreground">No pricing plans yet.</p> : plans.map((plan) => (
            <div key={plan.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-700 text-foreground">{plan.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {plan.effective?.onSale ? <><span className="line-through mr-1">{plan.currency} {plan.effective.regularPrice.toFixed(2)}</span><span className="font-700 text-success">{plan.currency} {plan.effective.finalPrice.toFixed(2)}</span></> : <span>{plan.currency} {Number(plan.price).toFixed(2)}</span>}
                  {' · '}{plan.billing_period.replace('_', ' ')}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => togglePlan(plan)} className="px-2 py-1 text-xs rounded-lg border border-border">{plan.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => editPlan(plan)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary"><Edit2 size={13} /></button>
                <button onClick={() => deletePlan(plan)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/10 text-danger"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
        <div className="flex items-center justify-between"><h4 className="text-xs font-800 text-foreground">{planForm.id ? 'Edit Pricing Plan' : 'Add Pricing Plan'}</h4>{planForm.id && <button onClick={() => setPlanForm(emptyPlan)} className="text-xs text-primary">New plan</button>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Plan name" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <select value={planForm.billing_period} onChange={(e) => setPlanForm({ ...planForm, billing_period: e.target.value as BillingPeriod })} className="px-3 py-2 text-sm bg-background border border-border rounded-xl">
            <option value="one_time">One-time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
          </select>
          <input type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="Regular price" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <select value={planForm.currency} onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })} className="px-3 py-2 text-sm bg-background border border-border rounded-xl"><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>CAD</option><option>JPY</option></select>
          <input type="number" min="0" step="0.01" value={planForm.sale_price} onChange={(e) => setPlanForm({ ...planForm, sale_price: e.target.value, sale_discount_type: '', sale_discount_value: '' })} placeholder="Sale price (optional)" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <select value={planForm.sale_discount_type} disabled={planForm.sale_price !== ''} onChange={(e) => setPlanForm({ ...planForm, sale_discount_type: e.target.value as '' | DiscountType })} className="px-3 py-2 text-sm bg-background border border-border rounded-xl disabled:opacity-50"><option value="">Discount type (optional)</option><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select>
          <input type="number" min="0" step="0.01" disabled={!planForm.sale_discount_type || planForm.sale_price !== ''} value={planForm.sale_discount_value} onChange={(e) => setPlanForm({ ...planForm, sale_discount_value: e.target.value })} placeholder="Discount value" className="px-3 py-2 text-sm bg-background border border-border rounded-xl disabled:opacity-50" />
          <div className="px-3 py-2 text-xs rounded-xl border border-primary/20 bg-primary/5 flex items-center">Preview: {planForm.currency} {preview.final.toFixed(2)}{preview.discount > 0 ? ` (save ${planForm.currency} ${preview.discount.toFixed(2)})` : ''}</div>
          <div><label className="text-[11px] text-muted-foreground">Sale starts</label><input type="datetime-local" value={planForm.sale_starts_at} onChange={(e) => setPlanForm({ ...planForm, sale_starts_at: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-xl" /></div>
          <div><label className="text-[11px] text-muted-foreground">Sale ends</label><input type="datetime-local" value={planForm.sale_ends_at} onChange={(e) => setPlanForm({ ...planForm, sale_ends_at: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-xl" /></div>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} /> Active pricing plan</label>
        <button onClick={savePlan} disabled={saving} className="btn-primary flex items-center gap-2"><Check size={13} />{planForm.id ? 'Update Price' : 'Add Pricing Plan'}</button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><div><h4 className="text-xs font-800 text-foreground">Coupons</h4><p className="text-[11px] text-muted-foreground mt-0.5">Product-specific discount codes.</p></div><Plus size={14} className="text-muted-foreground" /></div>
        {coupons.map((coupon) => (
          <div key={coupon.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
            <div><div className="text-sm font-700 text-foreground">{coupon.code}</div><div className="text-xs text-muted-foreground">{coupon.coupon_type === 'percentage' ? `${coupon.discount_value}%` : `$${Number(coupon.discount_value).toFixed(2)}`} · used {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''}</div></div>
            <div className="flex items-center gap-1"><button onClick={() => toggleCoupon(coupon)} className="px-2 py-1 text-xs rounded-lg border border-border">{coupon.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => editCoupon(coupon)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary"><Edit2 size={13} /></button><button onClick={() => deleteCoupon(coupon)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/10 text-danger"><Trash2 size={13} /></button></div>
          </div>
        ))}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-secondary/20">
          <input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="Coupon code" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <select value={couponForm.coupon_type} onChange={(e) => setCouponForm({ ...couponForm, coupon_type: e.target.value as DiscountType })} className="px-3 py-2 text-sm bg-background border border-border rounded-xl"><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select>
          <input type="number" min="0" step="0.01" value={couponForm.discount_value} onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })} placeholder="Discount value" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <input type="number" min="1" step="1" value={couponForm.max_uses} onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })} placeholder="Max uses (optional)" className="px-3 py-2 text-sm bg-background border border-border rounded-xl" />
          <div><label className="text-[11px] text-muted-foreground">Valid from</label><input type="datetime-local" value={couponForm.valid_from} onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-xl" /></div>
          <div><label className="text-[11px] text-muted-foreground">Valid until</label><input type="datetime-local" value={couponForm.valid_until} onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-xl" /></div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })} /> Active coupon</label>
          <button onClick={saveCoupon} disabled={saving} className="btn-primary flex items-center justify-center gap-2"><Check size={13} />{couponForm.id ? 'Update Coupon' : 'Create Coupon'}</button>
        </div>
      </div>
    </div>
  );
}
