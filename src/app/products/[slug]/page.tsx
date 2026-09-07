'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';
import {
  Star,
  CheckCircle2,
  ArrowRight,
  Tag,
  Zap,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Package,
  Globe,
  Cpu,
  Users,
  TrendingUp,
  Award,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';
import { SocialProofStrip } from '@/components/SocialProof';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(
  () => import('@/components/ui/Animated3DBackground'),
  { ssr: false }
);

interface ProductPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  is_verified: boolean;
  is_featured: boolean;
  reviewer_name: string;
  created_at: string;
  user_id: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_desc: string;
  category: string;
  status: string;
  thumbnail_url: string;
  demo_url: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getPlanPricing(plan: ProductPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return {
      regularPrice,
      salePrice: null,
      finalPrice: regularPrice,
      discountAmount: 0,
      discountPercent: 0,
      onSale: false,
    };
  }
}

function formatMoney(price: number, currency: string): string {
  if (price === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency || 'USD'} ${price % 1 === 0 ? price : price.toFixed(2)}`;
  }
}

function formatPlanPrice(plan: ProductPlan): string {
  const price = getPlanPricing(plan).finalPrice;
  if (price === 0) return 'Free';
  const formatted = formatMoney(price, plan.currency);
  if (plan.billing_period === 'monthly') return `${formatted}/mo`;
  if (plan.billing_period === 'yearly') return `${formatted}/yr`;
  if (plan.billing_period === 'lifetime') return `${formatted} once`;
  return formatted;
}

function checkoutHref(productId: string, plan?: ProductPlan | null) {
  if (!plan) return '/products';
  return `/checkout?product_id=${encodeURIComponent(productId)}&plan_id=${encodeURIComponent(plan.id)}`;
}

function billingLabel(period: string): string {
  const map: Record<string, string> = { one_time: 'One-time', monthly: 'Monthly', yearly: 'Yearly', lifetime: 'Lifetime' };
  return map[period] ?? period;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = { ai_tool: 'AI Tool', template: 'Template', dataset: 'Dataset', api: 'API', plugin: 'Plugin', course: 'Course', other: 'Product' };
  return map[cat] ?? 'Product';
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  );
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star size={22} className={(hovered || value) >= i ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'} />
        </button>
      ))}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="shimmer h-6 w-48 rounded-lg mb-8" />
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          <div className="space-y-6">
            <div className="shimmer h-10 w-3/4 rounded-xl" />
            <div className="shimmer h-5 w-full rounded-lg" />
            <div className="shimmer h-5 w-5/6 rounded-lg" />
            <div className="shimmer h-64 w-full rounded-2xl" />
          </div>
          <div className="space-y-4"><div className="shimmer h-72 w-full rounded-2xl" /></div>
        </div>
      </div>
    </div>
  );
}

function ProductNotFound() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <div className="pt-40 pb-20 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6"><Zap size={28} className="text-teal-600" /></div>
        <h1 className="text-2xl font-800 text-foreground mb-3">Product not found</h1>
        <p className="text-secondary-foreground mb-8 max-w-sm">This product doesn&apos;t exist or may have been removed.</p>
        <Link href="/products" className="btn-primary">Browse all products</Link>
      </div>
      <PublicFooter />
    </div>
  );
}

function PlanCard({ productId, plan, isFeatured }: { productId: string; plan: ProductPlan; isFeatured: boolean }) {
  const pricing = getPlanPricing(plan);
  const finalPrice = pricing.finalPrice;
  return (
    <div className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-300 ${isFeatured ? 'bg-gradient-to-br from-teal-600 to-teal-700 border-transparent shadow-2xl scale-[1.03]' : 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-lg'}`}>
      {isFeatured && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-700 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1"><Sparkles size={10} /> Most Popular</span>}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-base font-700 ${isFeatured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
          <span className={`text-xs font-500 px-2.5 py-1 rounded-full ${isFeatured ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'}`}>{billingLabel(plan.billing_period)}</span>
        </div>
        <p className={`text-xs ${isFeatured ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
      </div>
      <div>
        {pricing.onSale && <div className={`text-xs line-through mb-1 ${isFeatured ? 'text-white/55' : 'text-gray-400'}`}>{formatMoney(pricing.regularPrice, plan.currency)}</div>}
        <span className={`text-3xl font-800 tabular-nums ${isFeatured ? 'text-white' : 'text-gray-900'}`}>{finalPrice === 0 ? 'Free' : formatMoney(finalPrice, plan.currency)}</span>
        {finalPrice > 0 && <span className={`text-sm ml-1 ${isFeatured ? 'text-white/60' : 'text-gray-400'}`}>{plan.billing_period === 'monthly' ? '/mo' : plan.billing_period === 'yearly' ? '/yr' : plan.billing_period === 'lifetime' ? ' once' : ''}</span>}
        {pricing.onSale && pricing.discountPercent > 0 && <span className={`ml-2 text-xs font-700 ${isFeatured ? 'text-amber-200' : 'text-teal-600'}`}>Save {pricing.discountPercent}%</span>}
      </div>
      <ul className="space-y-2.5 flex-1">
        {plan.features?.map((feat, i) => <li key={i} className="flex items-start gap-2.5"><CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${isFeatured ? 'text-white/80' : 'text-teal-500'}`} /><span className={`text-sm ${isFeatured ? 'text-white/90' : 'text-gray-600'}`}>{feat}</span></li>)}
      </ul>
      <Link href={checkoutHref(productId, plan)} className={`w-full text-center py-2.5 rounded-xl text-sm font-600 transition-all duration-150 block ${isFeatured ? 'bg-white text-teal-700 hover:bg-white/90' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>{finalPrice === 0 ? 'Get for Free' : 'Get Started'} →</Link>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.reviewer_name || 'Customer';
  const initials = name.charAt(0).toUpperCase();
  const dateStr = new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm"><span className="text-sm font-700 text-white">{initials}</span></div><div><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-600 text-gray-900">{name}</span>{review.is_verified && <span className="flex items-center gap-1 text-xs text-teal-600 font-500 bg-teal-50 px-2 py-0.5 rounded-full"><ShieldCheck size={10} /> Verified</span>}</div><div className="flex items-center gap-2 mt-0.5"><StarRating rating={review.rating} size={12} /><span className="text-xs text-gray-400">{dateStr}</span></div></div></div></div>
      {review.title && <h4 className="text-sm font-700 text-gray-900">{review.title}</h4>}
      {review.body && <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>}
    </div>
  );
}

function AIProductAssistant({ product, plans }: { product: Product; plans: ProductPlan[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: `Hi! I'm your AI assistant for **${product.name}**. Ask me anything — features, pricing, use cases, or which plan fits you best.` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const planSummary = plans.map((plan) => `${plan.name}: ${formatPlanPrice(plan)} ${plan.billing_period}`).join(', ');

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const systemContext = `You are a helpful product assistant for "${product.name}".\nProduct description: ${product.short_desc || product.description}\nAvailable plans: ${planSummary}\nTags: ${product.tags?.join(', ')}\nOnly answer questions about this product. Be concise and helpful. Recommend the right plan based on user needs.`;
      const res = await fetch('/api/ai/store-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `[Context: ${systemContext}]\n\nUser question: ${text}`, history }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'I could not process that. Please try again.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const quickQuestions = ['What plan should I choose?', 'What are the key features?', 'Is there a free trial?'];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-700"><div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"><Bot size={16} className="text-white" /></div><div><h3 className="text-sm font-700 text-white">AI Product Assistant</h3><p className="text-xs text-white/70">Ask anything about this product</p></div><div className="ml-auto flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs text-white/70">Online</span></div></div>
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg, i) => <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-teal-100' : 'bg-gray-200'}`}>{msg.role === 'assistant' ? <Bot size={13} className="text-teal-600" /> : <User size={13} className="text-gray-600" />}</div><div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-700 shadow-sm' : 'bg-teal-600 text-white'}`}>{msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}</div></div>)}
        {loading && <div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><Bot size={13} className="text-teal-600" /></div><div className="bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 shadow-sm"><div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-100 bg-white">{quickQuestions.map((q) => <button key={q} onClick={() => setInput(q)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors font-500 border border-teal-100">{q}</button>)}</div>
      <div className="flex gap-2 p-3 border-t border-gray-100 bg-white"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask about features, pricing, use cases..." className="flex-1 px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" /><button onClick={sendMessage} disabled={!input.trim() || loading} className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 transition-colors flex-shrink-0"><Send size={14} /></button></div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return <div className="border border-gray-200 rounded-xl overflow-hidden"><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"><span className="text-sm font-600 text-gray-900 pr-4">{question}</span>{open ? <ChevronUp size={16} className="text-teal-600 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}</button>{open && <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50"><p className="pt-3">{answer}</p></div>}</div>;
}

function WriteReviewModal({ productId, onClose, onSuccess }: { productId: string; onClose: () => void; onSuccess: () => void }) {
  const [rating, setRating] = useState(5); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [name, setName] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const supabase = createClient();
  const handleSubmit = async () => {
    if (!body.trim()) { setError('Please write a review'); return; }
    setSaving(true); setError(''); const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in to leave a review'); setSaving(false); return; }
    const { error: err } = await supabase.from('reviews').insert({ user_id: user.id, product_id: productId, rating, title: title.trim(), body: body.trim(), reviewer_name: name.trim() || 'Anonymous', is_verified: false, moderation_status: 'pending' });
    if (err) setError(err.message.includes('unique') ? 'You have already reviewed this product.' : err.message); else { onSuccess(); onClose(); }
    setSaving(false);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}><div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-base font-700 text-gray-900">Write a Review</h2><button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"><X size={16} /></button></div><div className="p-5 space-y-4"><div><label className="block text-xs font-600 text-gray-500 mb-2">Your Rating</label><InteractiveStarRating value={rating} onChange={setRating} /></div><div><label className="block text-xs font-600 text-gray-500 mb-1.5">Your Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex M." className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl" /></div><div><label className="block text-xs font-600 text-gray-500 mb-1.5">Review Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Summarize your experience" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl" /></div><div><label className="block text-xs font-600 text-gray-500 mb-1.5">Your Review</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Share your experience with this product..." className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none" /></div>{error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}<p className="text-xs text-gray-400">Reviews are moderated before appearing publicly.</p></div><div className="flex gap-3 p-5 border-t border-gray-100"><button onClick={onClose} className="btn-secondary flex-1">Cancel</button><button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}Submit Review</button></div></div></div>;
}

export default function ProductDetailPage() {
  const params = useParams(); const slug = params?.slug as string;
  const [product, setProduct] = useState<Product | null>(null); const [plans, setPlans] = useState<ProductPlan[]>([]); const [reviews, setReviews] = useState<Review[]>([]); const [relatedProducts, setRelatedProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [notFound, setNotFound] = useState(false); const [showReviewModal, setShowReviewModal] = useState(false); const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => { const handleScroll = () => setStickyVisible(window.scrollY > 500); window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll); }, []);
  useEffect(() => {
    if (!slug) return;
    async function fetchData() {
      const supabase = createClient();
      const { data: productData, error } = await supabase.from('products').select('*').eq('slug', slug).eq('status', 'active').single();
      if (error || !productData) { setNotFound(true); setLoading(false); return; }
      setProduct(productData);
      const [plansResult, reviewsResult, relatedResult] = await Promise.all([
        supabase.from('product_plans').select('*').eq('product_id', productData.id).eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('reviews').select('*').eq('product_id', productData.id).eq('moderation_status', 'approved').order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(12),
        supabase.from('products').select('id, name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata, created_at').eq('status', 'active').eq('category', productData.category).neq('id', productData.id).limit(3),
      ]);
      setPlans((plansResult.data ?? []) as ProductPlan[]); setReviews(reviewsResult.data ?? []); setRelatedProducts(relatedResult.data ?? []); setLoading(false);
    }
    fetchData();
  }, [slug]);

  if (loading) return <ProductSkeleton />;
  if (notFound || !product) return <ProductNotFound />;

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const lowestPlan = plans.length > 0 ? plans.reduce((min, plan) => getPlanPricing(plan).finalPrice < getPlanPricing(min).finalPrice ? plan : min, plans[0]) : null;
  const lowestPricing = lowestPlan ? getPlanPricing(lowestPlan) : null;
  const featuredPlanIndex = plans.length > 1 ? Math.floor(plans.length / 2) : 0;
  const allFeatures = Array.from(new Set(plans.flatMap(p => p.features ?? []))).slice(0, 12);
  const mainCheckoutHref = checkoutHref(product.id, lowestPlan);
  const ratingDist = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length, pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0 }));
  const faqs = [
    { question: `What is ${product.name}?`, answer: product.short_desc || product.description || `${product.name} is a premium digital product from SUMMECA.` },
    { question: 'How do I access the product after purchase?', answer: 'Immediately after purchase, you will receive access via your SUMMECA dashboard. All downloads and licenses are available instantly.' },
    { question: 'Is there a refund policy?', answer: 'Yes, SUMMECA offers a 30-day money-back guarantee on all products. If you are not satisfied, contact our support team.' },
    { question: 'Can I upgrade my plan later?', answer: 'Absolutely. You can upgrade or change your plan at any time from your user dashboard. Billing is prorated automatically.' },
    { question: 'Do you offer team or enterprise pricing?', answer: 'Yes, we offer custom pricing for teams and enterprises. Contact our sales team for a tailored quote.' },
  ];
  const useCases = [
    { icon: Users, title: 'Teams & Agencies', desc: 'Scale your workflow with collaborative tools built for modern teams.' },
    { icon: TrendingUp, title: 'Entrepreneurs', desc: 'Launch faster with production-ready solutions that grow with you.' },
    { icon: Cpu, title: 'Developers', desc: 'Integrate powerful capabilities into your stack with clean APIs.' },
    { icon: Globe, title: 'Global Businesses', desc: 'Enterprise-grade reliability trusted by companies worldwide.' },
  ];
  const trustBadges = [{ icon: ShieldCheck, label: 'Secure Checkout' }, { icon: RefreshCw, label: '30-Day Refund' }, { icon: Lock, label: 'SSL Encrypted' }, { icon: Award, label: 'Premium Quality' }];

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${stickyVisible ? 'translate-y-0' : 'translate-y-full'}`}><div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-3"><div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-teal-600" /></div><div className="min-w-0"><p className="text-sm font-700 text-gray-900 truncate">{product.name}</p>{lowestPlan && <p className="text-xs text-gray-500">From {formatPlanPrice(lowestPlan)}</p>}</div></div><div className="flex items-center gap-3 flex-shrink-0">{avgRating && <div className="hidden sm:flex items-center gap-1.5"><StarRating rating={avgRating} size={12} /><span className="text-xs font-600 text-gray-700">{avgRating.toFixed(1)}</span></div>}<Link href={mainCheckoutHref} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 transition-colors flex items-center gap-1.5">{lowestPricing?.finalPrice === 0 ? 'Get Free' : 'Get Started'} <ArrowRight size={13} /></Link></div></div></div></div>

      <main className="pt-20 pb-20">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 pt-8 pb-2"><nav className="flex items-center gap-1.5 text-xs text-gray-400"><Link href="/" className="hover:text-gray-700 transition-colors">Home</Link><ChevronRight size={12} /><Link href="/products" className="hover:text-gray-700 transition-colors">Products</Link><ChevronRight size={12} /><span className="text-gray-700 font-500 truncate max-w-[200px]">{product.name}</span></nav></div>
        <section className="relative max-w-screen-xl mx-auto px-6 lg:px-8 py-10 overflow-hidden">
          <Animated3DBackground variant="light" />
          <div className="relative z-10 grid lg:grid-cols-[1fr_380px] gap-12 items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-5"><span className="text-xs font-700 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{categoryLabel(product.category)}</span>{product.tags?.slice(0, 4).map(tag => <span key={tag} className="flex items-center gap-1 text-xs font-500 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"><Tag size={10} />{tag}</span>)}</div>
              <h1 className="text-4xl lg:text-5xl font-800 text-gray-900 leading-tight mb-4 tracking-tight">{product.name}</h1>
              <div className="flex items-center gap-3 mb-4"><WishlistButton productId={product.id} productName={product.name} size="md" /><SocialProofStrip productName={product.name} purchaseCount={Math.floor(Math.random() * 200) + 50} /></div>
              {product.short_desc && <p className="text-lg text-gray-600 leading-relaxed mb-5 max-w-2xl">{product.short_desc}</p>}
              <div className="flex flex-wrap items-center gap-4 mb-7">{avgRating !== null ? <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"><StarRating rating={avgRating} size={14} /><span className="text-sm font-700 text-gray-900">{avgRating.toFixed(1)}</span><span className="text-xs text-gray-500">({reviews.length} reviews)</span></div> : null}{trustBadges.slice(0, 3).map(b => <div key={b.label} className="flex items-center gap-1.5 text-xs text-gray-500"><b.icon size={13} className="text-teal-500" />{b.label}</div>)}</div>
              {product.thumbnail_url && <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg mb-8 group"><img src={product.thumbnail_url} alt={`${product.name} product preview`} className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
              {product.description && <div className="mb-8"><h2 className="text-xl font-700 text-gray-900 mb-3">About this product</h2><p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p></div>}
              {allFeatures.length > 0 && <div className="mb-8"><h2 className="text-xl font-700 text-gray-900 mb-4">What&apos;s included</h2><div className="grid sm:grid-cols-2 gap-2.5">{allFeatures.map((feat, i) => <div key={i} className="flex items-start gap-2.5 bg-teal-50/50 border border-teal-100/60 rounded-xl px-4 py-3 hover:bg-teal-50 transition-colors"><CheckCircle2 size={15} className="text-teal-500 mt-0.5 flex-shrink-0" /><span className="text-sm text-gray-700">{feat}</span></div>)}</div></div>}
            </div>
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg"><div className="mb-5">{lowestPlan && lowestPricing ? <><p className="text-xs text-gray-400 mb-1 font-500">Starting from</p>{lowestPricing.onSale && <p className="text-sm text-gray-400 line-through mb-1">{formatMoney(lowestPricing.regularPrice, lowestPlan.currency)}</p>}<p className="text-4xl font-800 text-gray-900 tabular-nums">{formatPlanPrice(lowestPlan)}</p>{lowestPricing.onSale && lowestPricing.discountPercent > 0 && <p className="text-xs text-teal-600 font-700 mt-1">Save {lowestPricing.discountPercent}%</p>}</> : <p className="text-4xl font-800 text-gray-900">Free</p>}</div><Link href={mainCheckoutHref} className="w-full text-center py-3 rounded-xl text-sm font-700 bg-teal-600 text-white hover:bg-teal-700 transition-colors block mb-3 flex items-center justify-center gap-2">{lowestPricing?.finalPrice === 0 ? 'Get Free Access' : 'Get Started'} <ArrowRight size={14} /></Link>{product.demo_url && <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-center block mb-5 text-sm">View Demo</a>}<div className="space-y-2.5 pt-2 border-t border-gray-100">{trustBadges.map(b => <div key={b.label} className="flex items-center gap-2.5 text-xs text-gray-500"><b.icon size={13} className="text-teal-500 flex-shrink-0" />{b.label}</div>)}</div></div>
              <AIProductAssistant product={product} plans={plans} />
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-16"><div className="max-w-screen-xl mx-auto px-6 lg:px-8"><div className="text-center mb-10"><p className="text-xs font-700 uppercase tracking-widest text-teal-600 mb-2">Who is this for</p><h2 className="text-3xl font-800 text-gray-900">Built for modern professionals</h2></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{useCases.map((uc) => <div key={uc.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-teal-100 transition-all duration-200"><div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4"><uc.icon size={18} className="text-teal-600" /></div><h3 className="text-sm font-700 text-gray-900 mb-1.5">{uc.title}</h3><p className="text-xs text-gray-500 leading-relaxed">{uc.desc}</p></div>)}</div></div></section>

        {plans.length > 0 && <section className="py-16"><div className="max-w-screen-xl mx-auto px-6 lg:px-8"><div className="text-center mb-10"><p className="text-xs font-700 uppercase tracking-widest text-teal-600 mb-2">Pricing</p><h2 className="text-3xl font-800 text-gray-900">Choose your plan</h2><p className="text-gray-500 mt-2 max-w-md mx-auto">Pick the plan that fits your needs. Upgrade or cancel anytime.</p></div><div className={`grid gap-6 ${plans.length === 1 ? 'max-w-sm mx-auto' : plans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>{plans.map((plan, idx) => <PlanCard key={plan.id} productId={product.id} plan={plan} isFeatured={idx === featuredPlanIndex && plans.length > 1} />)}</div></div></section>}

        <section className="bg-gray-50 py-16"><div className="max-w-screen-xl mx-auto px-6 lg:px-8"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><p className="text-xs font-700 uppercase tracking-widest text-teal-600 mb-2">Reviews</p><h2 className="text-2xl font-800 text-gray-900">What customers say</h2></div><button onClick={() => setShowReviewModal(true)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 transition-colors flex items-center gap-2 self-start sm:self-auto"><MessageSquare size={14} /> Write a Review</button></div>{reviews.length > 0 ? <div className="grid lg:grid-cols-[280px_1fr] gap-8"><div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit"><div className="text-center mb-5"><p className="text-5xl font-800 text-gray-900">{avgRating?.toFixed(1)}</p><StarRating rating={avgRating ?? 0} size={18} /><p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p></div><div className="space-y-2">{ratingDist.map(({ star, count, pct }) => <div key={star} className="flex items-center gap-2"><span className="text-xs text-gray-500 w-3">{star}</span><Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" /><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div><span className="text-xs text-gray-400 w-4 text-right">{count}</span></div>)}</div></div><div className="grid sm:grid-cols-2 gap-4">{reviews.map(review => <ReviewCard key={review.id} review={review} />)}</div></div> : <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 rounded-2xl text-center"><div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4"><MessageSquare size={20} className="text-gray-400" /></div><p className="text-sm font-600 text-gray-900 mb-1">No reviews yet</p><p className="text-xs text-gray-400 mb-4">Be the first to review this product.</p><button onClick={() => setShowReviewModal(true)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 transition-colors">Write the first review</button></div>}</div></section>

        <section className="py-16"><div className="max-w-screen-xl mx-auto px-6 lg:px-8"><div className="max-w-2xl mx-auto"><div className="text-center mb-10"><p className="text-xs font-700 uppercase tracking-widest text-teal-600 mb-2">FAQ</p><h2 className="text-3xl font-800 text-gray-900">Frequently asked questions</h2></div><div className="space-y-3">{faqs.map(faq => <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />)}</div></div></div></section>

        {relatedProducts.length > 0 && <section className="bg-gray-50 py-16"><div className="max-w-screen-xl mx-auto px-6 lg:px-8"><div className="flex items-end justify-between mb-8"><div><p className="text-xs font-700 uppercase tracking-widest text-teal-600 mb-2">Related</p><h2 className="text-2xl font-800 text-gray-900">You might also like</h2></div><Link href="/products" className="text-sm font-600 text-teal-600 hover:text-teal-700 transition-colors">View all →</Link></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{relatedProducts.map(rp => <Link key={rp.id} href={`/products/${rp.slug}`} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-teal-100 transition-all duration-200 group"><div className="flex items-start gap-3 mb-3">{rp.thumbnail_url ? <img src={rp.thumbnail_url} alt={`${rp.name} thumbnail`} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-teal-600" /></div>}<div className="min-w-0"><h3 className="text-sm font-700 text-gray-900 group-hover:text-teal-600 transition-colors truncate">{rp.name}</h3><span className="text-xs text-gray-400">{categoryLabel(rp.category)}</span></div></div><p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{rp.short_desc}</p><div className="flex flex-wrap gap-1 mt-3">{rp.tags?.slice(0, 2).map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>)}</div></Link>)}</div></div></section>}

        <section className="py-16 bg-gradient-to-br from-teal-700 to-teal-900"><div className="max-w-screen-xl mx-auto px-6 lg:px-8 text-center"><div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-600 px-4 py-2 rounded-full mb-6 border border-white/20"><Sparkles size={12} /> Premium SUMMECA Product</div><h2 className="text-3xl font-800 text-white mb-4">Ready to get started with {product.name}?</h2><p className="text-teal-200 mb-8 max-w-md mx-auto">Join thousands of professionals using SUMMECA to work smarter and grow faster.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-4"><Link href={mainCheckoutHref} className="px-8 py-3 rounded-xl bg-white text-teal-700 text-base font-700 hover:bg-teal-50 transition-colors flex items-center gap-2">{lowestPricing?.finalPrice === 0 ? 'Get Free Access' : 'Get Started Now'} <ArrowRight size={16} /></Link><Link href="/products" className="text-sm font-600 text-teal-300 hover:text-white transition-colors">Browse all products →</Link></div></div></section>
      </main>

      {showReviewModal && <WriteReviewModal productId={product.id} onClose={() => setShowReviewModal(false)} onSuccess={() => { const supabase = createClient(); supabase.from('reviews').select('*').eq('product_id', product.id).eq('moderation_status', 'approved').order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(12).then(({ data }) => setReviews(data ?? [])); }} />}
      <PublicFooter />
    </div>
  );
}
