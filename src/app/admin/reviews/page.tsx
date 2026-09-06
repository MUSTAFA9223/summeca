'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, CheckCircle2, XCircle, Clock, Star, Eye, X } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  reviewer_name: string;
  is_verified: boolean;
  is_featured: boolean;
  moderation_status: string;
  created_at: string;
  user_id: string;
  product_id: string;
  product?: { name: string; slug: string };
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-teal-50 text-teal-700 border-teal-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  );
}

function ReviewDetailModal({ review, onClose, onAction }: { review: Review; onClose: () => void; onAction: (id: string, action: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-700 text-foreground">Review Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-700 text-foreground">{review.reviewer_name || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StarDisplay rating={review.rating} />
              {review.is_verified && <span className="text-xs text-teal-600 font-500">✓ Verified Purchase</span>}
            </div>
          </div>
          {review.product && (
            <div className="bg-secondary/40 rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground">Product: <span className="font-600 text-foreground">{review.product.name}</span></p>
            </div>
          )}
          {review.title && <h3 className="text-sm font-700 text-foreground">{review.title}</h3>}
          {review.body && <p className="text-sm text-secondary-foreground leading-relaxed">{review.body}</p>}
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-600 border ${review.moderation_status === key ? cfg.cls : 'bg-secondary text-muted-foreground border-border opacity-40'}`}>
                  <Icon size={11} />{cfg.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          {review.moderation_status !== 'approved' && (
            <button onClick={() => { onAction(review.id, 'approved'); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={14} /> Approve
            </button>
          )}
          {review.moderation_status !== 'rejected' && (
            <button onClick={() => { onAction(review.id, 'rejected'); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-600 hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-2">
              <XCircle size={14} /> Reject
            </button>
          )}
          {review.moderation_status !== 'pending' && (
            <button onClick={() => { onAction(review.id, 'pending'); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-600 hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
              <Clock size={14} /> Set Pending
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const supabase = createClient();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('reviews')
      .select('*, product:products(name, slug)')
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('moderation_status', statusFilter);
    const { data, error } = await query;
    if (error) { toast.error(error.message); } else { setReviews(data ?? []); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAction = async (id: string, action: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({ moderation_status: action, moderated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(error.message); } else {
      toast.success(`Review ${action}`);
      fetchReviews();
    }
  };

  const handleToggleFeatured = async (review: Review) => {
    const { error } = await supabase.from('reviews').update({ is_featured: !review.is_featured }).eq('id', review.id);
    if (error) { toast.error(error.message); } else {
      toast.success(review.is_featured ? 'Removed from featured' : 'Marked as featured');
      fetchReviews();
    }
  };

  const filtered = reviews.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.reviewer_name ?? '').toLowerCase().includes(q) || (r.title ?? '').toLowerCase().includes(q) || (r.body ?? '').toLowerCase().includes(q) || (r.product?.name ?? '').toLowerCase().includes(q);
  });

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.moderation_status === 'pending').length,
    approved: reviews.filter(r => r.moderation_status === 'approved').length,
    rejected: reviews.filter(r => r.moderation_status === 'rejected').length,
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 text-foreground">Review Moderation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reviews.length} total reviews</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: 'All', count: counts.all },
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'rejected', label: 'Rejected', count: counts.rejected },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 transition-all ${statusFilter === tab.key ? 'bg-primary text-white shadow-sm' : 'bg-card border border-border text-secondary-foreground hover:text-foreground hover:border-primary/30'}`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Reviewer</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Review</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-right text-xs font-700 text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded shimmer w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No reviews found</td></tr>
              ) : (
                filtered.map(review => {
                  const cfg = STATUS_CONFIG[review.moderation_status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={review.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-600 text-foreground text-xs">{review.reviewer_name || 'Anonymous'}</div>
                          {review.is_verified && <span className="text-xs text-teal-600">✓ Verified</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{review.product?.name ?? '—'}</td>
                      <td className="px-4 py-3"><StarDisplay rating={review.rating} /></td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {review.title && <p className="text-xs font-600 text-foreground truncate">{review.title}</p>}
                        <p className="text-xs text-muted-foreground truncate">{review.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 border ${cfg.cls}`}>
                          <StatusIcon size={10} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedReview(review)} title="View" className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                            <Eye size={13} />
                          </button>
                          {review.moderation_status !== 'approved' && (
                            <button onClick={() => handleAction(review.id, 'approved')} title="Approve" className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-teal-600 hover:bg-teal-50 transition-all">
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {review.moderation_status !== 'rejected' && (
                            <button onClick={() => handleAction(review.id, 'rejected')} title="Reject" className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
                              <XCircle size={13} />
                            </button>
                          )}
                          <button onClick={() => handleToggleFeatured(review)} title={review.is_featured ? 'Unfeature' : 'Feature'} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${review.is_featured ? 'text-amber-500 bg-amber-50' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50'}`}>
                            <Star size={13} className={review.is_featured ? 'fill-amber-400' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReview && (
        <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} onAction={handleAction} />
      )}
    </div>
  );
}
