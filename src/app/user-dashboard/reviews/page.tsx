'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, MessageSquareText, Package, RefreshCw, Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type ProductRef = {
  name: string;
  slug: string;
} | null;

type EligibleOrder = {
  id: string;
  product_id: string;
  created_at: string;
  amount: number;
  currency: string;
  products: ProductRef;
};

type ReviewRow = {
  id: string;
  product_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string | null;
};

type Draft = {
  rating: number;
  title: string;
  body: string;
};

const EMPTY_DRAFT: Draft = { rating: 0, title: '', body: '' };

function statusBadge(status?: ReviewRow['moderation_status']) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-700 text-emerald-700">
        <CheckCircle2 size={12} /> Published
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-700 text-red-700">
        <MessageSquareText size={12} /> Needs changes
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-700 text-amber-700">
        <Clock3 size={12} /> Pending review
      </span>
    );
  }
  return null;
}

function StarInput({ value, onChange, disabled }: { value: number; onChange: (rating: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Product rating">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
          disabled={disabled}
          onClick={() => onChange(rating)}
          className="rounded-md p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            size={25}
            className={rating <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<EligibleOrder[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState('Customer');

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setReviews({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [ordersResult, reviewsResult, profileResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, product_id, created_at, amount, currency, products(name, slug)')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gt('amount', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('id, product_id, order_id, rating, title, body, reviewer_name, moderation_status, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (reviewsResult.error) throw reviewsResult.error;

      const uniqueByProduct = new Map<string, EligibleOrder>();
      for (const raw of ordersResult.data ?? []) {
        const order = raw as unknown as EligibleOrder;
        if (order.product_id && !uniqueByProduct.has(order.product_id)) {
          uniqueByProduct.set(order.product_id, order);
        }
      }

      const reviewMap: Record<string, ReviewRow> = {};
      const nextDrafts: Record<string, Draft> = {};
      for (const raw of reviewsResult.data ?? []) {
        const review = raw as ReviewRow;
        reviewMap[review.product_id] = review;
        nextDrafts[review.product_id] = {
          rating: Number(review.rating) || 0,
          title: review.title ?? '',
          body: review.body ?? '',
        };
      }

      setOrders(Array.from(uniqueByProduct.values()));
      setReviews(reviewMap);
      setDrafts((current) => ({ ...current, ...nextDrafts }));

      const profileName = profileResult.data?.full_name?.trim();
      setReviewerName(
        profileName ||
          user.user_metadata?.full_name?.trim?.() ||
          user.email?.split('@')[0] ||
          'Customer',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load your review eligibility.');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (productId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [productId]: { ...(current[productId] ?? EMPTY_DRAFT), ...patch },
    }));
  };

  const submitReview = async (order: EligibleOrder) => {
    if (!user || savingProductId) return;

    const draft = drafts[order.product_id] ?? EMPTY_DRAFT;
    const title = draft.title.trim();
    const body = draft.body.trim();

    if (draft.rating < 1 || draft.rating > 5) {
      toast.error('Choose a rating from 1 to 5 stars.');
      return;
    }
    if (body.length < 10) {
      toast.error('Please write at least 10 characters about your experience.');
      return;
    }

    setSavingProductId(order.product_id);
    try {
      const existing = reviews[order.product_id];
      const reviewPayload = {
        order_id: order.id,
        rating: draft.rating,
        title: title || null,
        body,
        reviewer_name: reviewerName.slice(0, 100),
        is_verified: true,
        is_featured: false,
        moderation_status: 'pending' as const,
        moderated_at: null,
        moderated_by: null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('reviews')
          .update(reviewPayload)
          .eq('id', existing.id)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('reviews').insert({
          ...reviewPayload,
          user_id: user.id,
          product_id: order.product_id,
        });
        if (insertError) throw insertError;
      }

      toast.success(existing ? 'Review updated and sent for approval.' : 'Review submitted for approval.');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save your review.');
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <DashboardLayout activeRoute="reviews">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-800 text-foreground">Product Reviews</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Rate products you purchased. Every submitted review is tied to a completed paid order and is checked before it appears publicly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-700 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-700 text-foreground">Verified Purchase reviews only</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A review can only be submitted when SUMMECA has a completed paid order for the same account and product. Editing a published review sends it back for approval.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Package size={22} className="text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-800 text-foreground">No products are ready for review yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Products become reviewable after a paid order is completed and verified.
            </p>
            <Link href="/products" className="btn-primary mt-5 inline-flex items-center justify-center">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {orders.map((order) => {
              const draft = drafts[order.product_id] ?? EMPTY_DRAFT;
              const review = reviews[order.product_id];
              const saving = savingProductId === order.product_id;
              return (
                <section key={order.product_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-800 text-foreground">{order.products?.name || 'SUMMECA product'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Verified purchase</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {statusBadge(review?.moderation_status)}
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-xs font-700 text-foreground">Your rating</label>
                    <StarInput value={draft.rating} onChange={(rating) => updateDraft(order.product_id, { rating })} disabled={saving} />
                  </div>

                  <div className="mt-4">
                    <label htmlFor={`review-title-${order.product_id}`} className="mb-1.5 block text-xs font-700 text-foreground">
                      Review title <span className="font-400 text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      id={`review-title-${order.product_id}`}
                      value={draft.title}
                      maxLength={120}
                      disabled={saving}
                      onChange={(event) => updateDraft(order.product_id, { title: event.target.value })}
                      placeholder="What stood out?"
                      className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor={`review-body-${order.product_id}`} className="text-xs font-700 text-foreground">Your comment</label>
                      <span className="text-[11px] text-muted-foreground">{draft.body.length}/2000</span>
                    </div>
                    <textarea
                      id={`review-body-${order.product_id}`}
                      value={draft.body}
                      rows={4}
                      minLength={10}
                      maxLength={2000}
                      disabled={saving}
                      onChange={(event) => updateDraft(order.product_id, { body: event.target.value })}
                      placeholder="Tell other customers what your experience was like..."
                      className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-muted-foreground">
                      {review
                        ? 'Saving changes will return this review to pending moderation.'
                        : 'Your review will appear on the product page after approval.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void submitReview(order)}
                      disabled={saving || draft.rating === 0 || draft.body.trim().length < 10}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-700 text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      {saving ? 'Saving...' : review ? 'Update review' : 'Submit review'}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
