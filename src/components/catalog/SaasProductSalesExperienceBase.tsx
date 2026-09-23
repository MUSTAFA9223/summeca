'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
} from 'lucide-react';
import PublicFooter from '@/components/PublicFooter';
import PublicNav from '@/components/PublicNav';
import WishlistButton from '@/components/WishlistButton';
import { getEffectivePrice } from '@/lib/pricing';
import { trackFunnelEvent } from '@/lib/funnelAnalytics';

export type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

export interface SaasSalesPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

export interface SaasSalesProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_desc: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

type SalesSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';
type Locale = 'en' | 'ar';
type Copy = { en: string; ar: string };
type StoryItem = { title: Copy; text: Copy; icon?: LucideIcon };

type ProductStory = {
  eyebrow: Copy;
  headline: Copy;
  supportingCopy: Copy;
  finalHeadline: Copy;
  primaryCta: Copy;
  previewLabel: Copy;
  buyerReceives: Copy[];
  steps: StoryItem[];
  audiences: StoryItem[];
  features: StoryItem[];
  workflow: Copy[];
};

const UI = {
  backToSaas: { en: 'SUMMECA SaaS', ar: 'منتجات SUMMECA SaaS' },
  whatYouGet: { en: 'What you get with your plan', ar: 'ما الذي تحصل عليه مع خطتك' },
  startingPrice: { en: 'Current selected price', ar: 'السعر الحالي للخطة المحددة' },
  noPlan: { en: 'No active plan is currently available.', ar: 'لا توجد خطة نشطة متاحة حاليًا.' },
  checkoutConfirmation: {
    en: 'Checkout re-confirms the exact product, selected plan, price, currency and access period before payment. The payment schedule is also confirmed at checkout.',
    ar: 'تعيد صفحة الدفع تأكيد المنتج والخطة والسعر والعملة ومدة الوصول قبل إتمام الدفع، كما يتم تأكيد جدول الدفع في صفحة Checkout.',
  },
  trust: {
    en: 'Start with the limited Free tier in your SUMMECA account. Paid plans unlock higher limits. This is a working SaaS workspace, not a downloadable ZIP.',
    ar: 'ابدأ بالمستوى المجاني المحدود داخل حساب SUMMECA، وتفتح الخطط المدفوعة حدودًا أعلى. هذا تطبيق SaaS يعمل داخل الحساب وليس ملف ZIP للتنزيل.',
  },
  seePreview: { en: 'See the real product preview', ar: 'شاهد معاينة المنتج الحقيقية' },
  howItWorks: { en: 'How it works', ar: 'كيف يعمل' },
  threeSteps: { en: 'From setup to the next action in three steps', ar: 'من الإعداد إلى الإجراء التالي في ثلاث خطوات' },
  whoFor: { en: 'Who it is for', ar: 'لمن صُمم' },
  handsOn: { en: 'A focused workspace for hands-on operators', ar: 'مساحة عمل مركزة لأصحاب الأعمال الذين يديرون العمل بأنفسهم' },
  workflowLabel: { en: 'Real product workflow', ar: 'سير العمل الحقيقي داخل المنتج' },
  workflowTitle: { en: 'What actually happens inside the workspace', ar: 'ما الذي يحدث فعليًا داخل مساحة العمل' },
  capabilities: { en: 'Real product capabilities', ar: 'إمكانات المنتج الحقيقية' },
  capabilitiesTitle: { en: 'What you can do in', ar: 'ما الذي يمكنك فعله في' },
  capabilitiesNote: {
    en: 'These capabilities reflect the current SUMMECA workspace. Limits and availability vary by the active plan shown below.',
    ar: 'تعكس هذه الإمكانات مساحة SUMMECA الحالية. تختلف الحدود والتوفر بحسب الخطة النشطة الموضحة أدناه.',
  },
  plansLabel: { en: 'Plans and limits', ar: 'الخطط والحدود' },
  plansTitle: { en: 'Choose the access level that fits your workflow', ar: 'اختر مستوى الوصول المناسب لسير عملك' },
  plansNote: {
    en: 'Prices, currencies, access periods and included limits come directly from the active plans used by SUMMECA checkout.',
    ar: 'الأسعار والعملات ومدد الوصول والحدود المضمنة تأتي مباشرة من الخطط النشطة المستخدمة في دفع SUMMECA.',
  },
  selected: { en: 'Selected', ar: 'محددة' },
  selectPlan: { en: 'Select plan', ar: 'اختر الخطة' },
  continueWith: { en: 'Continue with', ar: 'متابعة باستخدام' },
  noPublishedPlan: { en: 'No active plan is available right now.', ar: 'لا توجد خطة نشطة متاحة الآن.' },
  checkoutUnavailable: {
    en: 'Checkout remains unavailable until a production plan is published.',
    ar: 'يبقى الدفع غير متاح حتى يتم نشر خطة إنتاجية.',
  },
  afterPurchase: { en: 'What happens after purchase', ar: 'ماذا يحدث بعد الشراء' },
  accountAccess: { en: 'Account access after verified payment', ar: 'الوصول إلى الحساب بعد التحقق من الدفع' },
  deliveryCopy: {
    en: 'InvoiceFlow and LeadFollow AI run inside your SUMMECA account. The limited Free tier works without a purchase; higher paid limits unlock after verified checkout.',
    ar: 'يعمل InvoiceFlow وLeadFollow AI داخل حساب SUMMECA. يعمل المستوى المجاني المحدود دون شراء، بينما تُفتح الحدود المدفوعة الأعلى بعد التحقق من الدفع.',
  },
  deliveryNote: {
    en: 'Other SUMMECA digital products may use protected downloads. The delivery type for this product is shown before payment.',
    ar: 'قد تستخدم منتجات SUMMECA الرقمية الأخرى تنزيلات محمية. نوع التسليم لهذا المنتج موضح قبل الدفع.',
  },
  faq: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  faqTitle: { en: 'Before you choose a plan', ar: 'قبل اختيار الخطة' },
  finalCopy: {
    en: 'Select an active plan, complete checkout, and open the workspace from your SUMMECA account after payment verification.',
    ar: 'اختر خطة نشطة، أكمل الدفع، ثم افتح مساحة العمل من حساب SUMMECA بعد التحقق من الدفع.',
  },
  verified: { en: 'Verified account access · plan limits enforced', ar: 'وصول موثق للحساب · يتم تطبيق حدود الخطة' },
  buySelected: { en: 'Buy selected plan', ar: 'اشترِ الخطة المحددة' },
  secureLine: { en: 'Protected checkout · account access · support available', ar: 'دفع محمي · وصول داخل الحساب · دعم متاح' },
} satisfies Record<string, Copy>;

const STORIES: Record<SalesSlug, ProductStory> = {
  'summeca-invoiceflow': {
    eyebrow: { en: 'Invoice workspace', ar: 'مساحة عمل للفواتير' },
    headline: { en: 'Create professional invoices in minutes, not spreadsheets.', ar: 'أنشئ فواتير احترافية خلال دقائق بدلًا من الجداول.' },
    supportingCopy: {
      en: 'Manage clients, create invoices, track billing and keep your invoice workflow organized from one workspace.',
      ar: 'أدر العملاء وأنشئ الفواتير وتابع حالتها ونظّم دورة الفوترة من مساحة عمل واحدة.',
    },
    finalHeadline: { en: 'Start building better invoices with SUMMECA InvoiceFlow.', ar: 'ابدأ بإنشاء فواتير أفضل مع SUMMECA InvoiceFlow.' },
    primaryCta: { en: 'Choose an InvoiceFlow plan', ar: 'اختر خطة InvoiceFlow' },
    previewLabel: { en: 'InvoiceFlow real product preview', ar: 'معاينة حقيقية لمنتج InvoiceFlow' },
    buyerReceives: [
      { en: 'Private InvoiceFlow workspace inside your SUMMECA account', ar: 'مساحة InvoiceFlow خاصة داخل حساب SUMMECA' },
      { en: 'Client records, invoice builder, payment-status tracking and PDF workflow', ar: 'سجلات العملاء، منشئ الفواتير، تتبع حالة الدفع وسير عمل PDF' },
      { en: 'Plan limits and access period shown clearly before checkout', ar: 'حدود الخطة ومدة الوصول موضحتان قبل الدفع' },
    ],
    steps: [
      { title: { en: 'Add your client', ar: 'أضف العميل' }, text: { en: 'Keep the client details you need for billing in one place.', ar: 'احتفظ ببيانات العميل اللازمة للفوترة في مكان واحد.' } },
      { title: { en: 'Create the invoice', ar: 'أنشئ الفاتورة' }, text: { en: 'Add line items, dates, tax, notes and terms in the invoice builder.', ar: 'أضف البنود والتواريخ والضريبة والملاحظات والشروط في منشئ الفاتورة.' } },
      { title: { en: 'Preview and track', ar: 'عاين وتابع' }, text: { en: 'Preview or save the invoice as PDF and keep its payment status organized.', ar: 'عاين الفاتورة أو احفظها PDF وحافظ على حالة الدفع منظمة.' } },
    ],
    audiences: [
      { title: { en: 'Freelancers', ar: 'المستقلون' }, text: { en: 'Create and track invoices without maintaining a spreadsheet.', ar: 'أنشئ الفواتير وتابعها دون الاعتماد على جدول بيانات.' }, icon: UserRound },
      { title: { en: 'Consultants', ar: 'المستشارون' }, text: { en: 'Keep client billing details and invoice status organized.', ar: 'نظّم بيانات فوترة العملاء وحالات الفواتير.' }, icon: BriefcaseBusiness },
      { title: { en: 'Agencies', ar: 'الوكالات' }, text: { en: 'Handle higher client and invoice volumes with plan-based limits.', ar: 'أدر عددًا أكبر من العملاء والفواتير وفق حدود الخطة.' }, icon: UsersRound },
      { title: { en: 'Small businesses', ar: 'الأعمال الصغيرة' }, text: { en: 'Use one workspace for clients, invoices and billing summaries.', ar: 'استخدم مساحة واحدة للعملاء والفواتير وملخصات الفوترة.' }, icon: Building2 },
    ],
    features: [
      { title: { en: 'Client management', ar: 'إدارة العملاء' }, text: { en: 'Store client contact and billing details in your private account workspace.', ar: 'احفظ بيانات الاتصال والفوترة للعملاء داخل مساحة حسابك الخاصة.' }, icon: UsersRound },
      { title: { en: 'Invoice builder', ar: 'منشئ الفواتير' }, text: { en: 'Create itemized invoices with dates, tax, notes, terms and calculated totals.', ar: 'أنشئ فواتير مفصلة مع التواريخ والضريبة والملاحظات والشروط والإجماليات المحسوبة.' }, icon: ReceiptText },
      { title: { en: 'Payment status tracking', ar: 'تتبع حالة الدفع' }, text: { en: 'Keep invoice status visible so billing work stays organized.', ar: 'حافظ على حالة الفاتورة ظاهرة حتى يظل عمل الفوترة منظمًا.' }, icon: FileCheck2 },
      { title: { en: 'Billing overview', ar: 'نظرة عامة على الفوترة' }, text: { en: 'See billing summaries derived from your invoice records.', ar: 'شاهد ملخصات الفوترة المستندة إلى سجلات فواتيرك.' }, icon: LayoutDashboard },
      { title: { en: 'Preview and PDF', ar: 'المعاينة وPDF' }, text: { en: 'Preview the invoice and use the available print or PDF workflow.', ar: 'عاين الفاتورة واستخدم مسار الطباعة أو PDF المتاح.' }, icon: FileText },
      { title: { en: 'Plan-based limits', ar: 'حدود حسب الخطة' }, text: { en: 'Available volume and extras follow the limits listed on the selected production plan.', ar: 'الحجم والميزات الإضافية المتاحة تتبع الحدود المدرجة في خطة الإنتاج المحددة.' }, icon: CircleDollarSign },
    ],
    workflow: [
      { en: 'Open your InvoiceFlow workspace from your SUMMECA account.', ar: 'افتح مساحة InvoiceFlow من حساب SUMMECA.' },
      { en: 'Create or choose a client, then build the invoice with real line items.', ar: 'أنشئ عميلًا أو اختره، ثم ابنِ الفاتورة ببنود فعلية.' },
      { en: 'Add tax, notes and terms, then review the invoice before using the PDF/print workflow.', ar: 'أضف الضريبة والملاحظات والشروط، ثم راجع الفاتورة قبل استخدام مسار PDF/الطباعة.' },
      { en: 'Keep the payment status updated so the invoice list remains useful.', ar: 'حدّث حالة الدفع حتى تبقى قائمة الفواتير مفيدة ومنظمة.' },
    ],
  },
  'summeca-leadfollow-ai': {
    eyebrow: { en: 'Lead follow-up workspace', ar: 'مساحة متابعة العملاء المحتملين' },
    headline: { en: 'Turn new leads into better follow-ups, faster.', ar: 'حوّل العملاء المحتملين إلى متابعات أفضل وبسرعة أكبر.' },
    supportingCopy: {
      en: 'Organize leads, schedule follow-ups and prepare AI-assisted drafts that you review before sending.',
      ar: 'نظّم العملاء المحتملين وحدد مواعيد المتابعة وأنشئ مسودات بمساعدة الذكاء الاصطناعي تراجعها قبل الإرسال.',
    },
    finalHeadline: { en: 'Organize your leads and move every follow-up forward.', ar: 'نظّم العملاء المحتملين وادفع كل متابعة إلى الخطوة التالية.' },
    primaryCta: { en: 'Choose a LeadFollow AI plan', ar: 'اختر خطة LeadFollow AI' },
    previewLabel: { en: 'LeadFollow AI real product preview', ar: 'معاينة حقيقية لمنتج LeadFollow AI' },
    buyerReceives: [
      { en: 'Private LeadFollow AI workspace inside your SUMMECA account', ar: 'مساحة LeadFollow AI خاصة داخل حساب SUMMECA' },
      { en: 'Lead pipeline, scheduled follow-ups, editable AI-assisted drafts and saved history', ar: 'مسار للعملاء المحتملين، مواعيد متابعة، مسودات قابلة للتعديل بمساعدة AI وسجل محفوظ' },
      { en: 'Plan lead limits and AI usage allowance shown before checkout', ar: 'حدود العملاء المحتملين واستخدام AI حسب الخطة موضحة قبل الدفع' },
    ],
    steps: [
      { title: { en: 'Add a lead', ar: 'أضف عميلًا محتملًا' }, text: { en: 'Record the contact details and factual context you already know.', ar: 'سجل بيانات الاتصال والسياق الواقعي الذي تعرفه بالفعل.' } },
      { title: { en: 'Set the follow-up', ar: 'حدد المتابعة' }, text: { en: 'Choose the pipeline status and the next follow-up date.', ar: 'اختر حالة المسار وتاريخ المتابعة القادمة.' } },
      { title: { en: 'Generate, review and edit', ar: 'أنشئ وراجع وعدّل' }, text: { en: 'Generate an AI-assisted draft, review it and edit it before you decide to send it.', ar: 'أنشئ مسودة بمساعدة AI ثم راجعها وعدّلها قبل أن تقرر إرسالها.' } },
    ],
    audiences: [
      { title: { en: 'Freelancers', ar: 'المستقلون' }, text: { en: 'Keep prospects and next actions visible in one workflow.', ar: 'حافظ على العملاء المحتملين والخطوات التالية واضحة في سير عمل واحد.' }, icon: UserRound },
      { title: { en: 'Agencies', ar: 'الوكالات' }, text: { en: 'Organize larger lead lists with plan-based limits.', ar: 'نظّم قوائم أكبر من العملاء المحتملين وفق حدود الخطة.' }, icon: UsersRound },
      { title: { en: 'Service businesses', ar: 'الأعمال الخدمية' }, text: { en: 'Prepare consistent follow-ups using your real offer and context.', ar: 'جهّز متابعات متسقة اعتمادًا على عرضك وسياقك الحقيقي.' }, icon: BriefcaseBusiness },
      { title: { en: 'Small sales teams', ar: 'فرق المبيعات الصغيرة' }, text: { en: 'Track pipeline status, due follow-ups and saved draft history.', ar: 'تابع حالة المسار والمتابعات المستحقة وسجل المسودات المحفوظة.' }, icon: Building2 },
    ],
    features: [
      { title: { en: 'Lead pipeline', ar: 'مسار العملاء المحتملين' }, text: { en: 'Track opportunities through the statuses available in the current workspace.', ar: 'تابع الفرص عبر الحالات المتاحة في مساحة العمل الحالية.' }, icon: Target },
      { title: { en: 'Follow-up date', ar: 'تاريخ المتابعة' }, text: { en: 'Save the next follow-up date so due opportunities stay visible.', ar: 'احفظ تاريخ المتابعة القادمة حتى تظل الفرص المستحقة واضحة.' }, icon: Clock3 },
      { title: { en: 'Lead context', ar: 'سياق العميل المحتمل' }, text: { en: 'Add factual context so the draft can reflect the information you provide.', ar: 'أضف سياقًا واقعيًا حتى تعكس المسودة المعلومات التي تقدمها.' }, icon: MessageSquareText },
      { title: { en: 'AI-assisted drafts', ar: 'مسودات بمساعدة AI' }, text: { en: 'Generate an editable follow-up draft using the supported controls.', ar: 'أنشئ مسودة متابعة قابلة للتعديل باستخدام عناصر التحكم المدعومة.' }, icon: Sparkles },
      { title: { en: 'Review before sending', ar: 'المراجعة قبل الإرسال' }, text: { en: 'The generated draft remains reviewable and editable; email is not sent before your confirmation.', ar: 'تبقى المسودة قابلة للمراجعة والتعديل؛ ولا يتم إرسال البريد قبل تأكيدك.' }, icon: Bot },
      { title: { en: 'AI usage limits', ar: 'حدود استخدام AI' }, text: { en: 'AI usage follows the allowance shown on the selected active plan.', ar: 'يتبع استخدام AI الحد الموضح في الخطة النشطة التي تختارها.' }, icon: FileText },
    ],
    workflow: [
      { en: 'Open LeadFollow AI from your SUMMECA account and add a lead.', ar: 'افتح LeadFollow AI من حساب SUMMECA وأضف عميلًا محتملًا.' },
      { en: 'Set the follow-up date and add the context you want the draft to use.', ar: 'حدد تاريخ المتابعة وأضف السياق الذي تريد أن تستخدمه المسودة.' },
      { en: 'Generate an AI-assisted draft within your plan allowance.', ar: 'أنشئ مسودة بمساعدة AI ضمن حد الاستخدام في خطتك.' },
      { en: 'Review and edit the draft. Email is not sent before your confirmation.', ar: 'راجع المسودة وعدّلها. لا يتم إرسال البريد قبل تأكيدك.' },
    ],
  },
};

const FAQS: Array<{ question: Copy; answer: Copy }> = [
  {
    question: { en: 'What type of product is this?', ar: 'ما نوع هذا المنتج؟' },
    answer: { en: 'It is a SaaS workspace used inside your SUMMECA account.', ar: 'هو تطبيق SaaS يعمل داخل حساب SUMMECA.' },
  },
  {
    question: { en: 'How do I get access?', ar: 'كيف أحصل على الوصول؟' },
    answer: { en: 'You can start with the limited Free tier after signing in. Choose a paid plan only when you need higher limits; paid access is unlocked after verified checkout.', ar: 'يمكنك البدء بالمستوى المجاني المحدود بعد تسجيل الدخول. اختر خطة مدفوعة عندما تحتاج حدودًا أعلى، ويتم فتحها بعد التحقق من الدفع.' },
  },
  {
    question: { en: 'Is it a download or ZIP file?', ar: 'هل هو تنزيل أو ملف ZIP؟' },
    answer: { en: 'No. InvoiceFlow and LeadFollow AI run inside SUMMECA. Other digital products on SUMMECA may use protected downloads.', ar: 'لا. يعمل InvoiceFlow وLeadFollow AI داخل SUMMECA. قد تستخدم منتجات رقمية أخرى في SUMMECA تنزيلات محمية.' },
  },
  {
    question: { en: 'What does the price include?', ar: 'ماذا يشمل السعر؟' },
    answer: { en: 'The selected production plan shows its current price, currency, access period and included limits. Checkout confirms these details again before payment.', ar: 'تعرض خطة الإنتاج المحددة السعر الحالي والعملة ومدة الوصول والحدود المضمنة. وتعيد صفحة الدفع تأكيد هذه التفاصيل قبل الدفع.' },
  },
  {
    question: { en: 'Are there plan limits?', ar: 'هل توجد حدود للخطة؟' },
    answer: { en: 'Yes. Limits come from the active plan data shown on this page and are enforced by the existing product entitlement.', ar: 'نعم. تأتي الحدود من بيانات الخطة النشطة المعروضة في هذه الصفحة ويتم تطبيقها بواسطة صلاحية المنتج الحالية.' },
  },
  {
    question: { en: 'Where do I find the product after purchase?', ar: 'أين أجد المنتج بعد الشراء؟' },
    answer: { en: 'After verified payment, open your SUMMECA account and access the purchased SaaS workspace from your account area.', ar: 'بعد التحقق من الدفع، افتح حساب SUMMECA وادخل إلى مساحة SaaS المشتراة من منطقة حسابك.' },
  },
  {
    question: { en: 'How do I get support?', ar: 'كيف أحصل على الدعم؟' },
    answer: { en: 'Use the support or contact option available on SUMMECA and include the product name and the account used for the purchase.', ar: 'استخدم خيار الدعم أو التواصل المتاح في SUMMECA واذكر اسم المنتج والحساب المستخدم للشراء.' },
  },
];

// Regression markers for the honest static fallback shown only while the real preview portal is unavailable.
const PREVIEW_FALLBACK = {
  invoice: 'SAMPLE DATA',
  lead: 'AI draft example — review before sending · SAMPLE DATA',
};

export function isSaasSalesSlug(slug: string): slug is SalesSlug {
  return slug === 'summeca-invoiceflow' || slug === 'summeca-leadfollow-ai';
}

function text(copy: Copy, locale: Locale) {
  return copy[locale];
}

function usePageLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const root = document.documentElement;
    const readLocale = () => {
      const lang = (root.lang || '').toLowerCase();
      setLocale(lang.startsWith('ar') || root.dir === 'rtl' ? 'ar' : 'en');
    };
    readLocale();
    const observer = new MutationObserver(readLocale);
    observer.observe(root, { attributes: true, attributeFilter: ['lang', 'dir'] });
    return () => observer.disconnect();
  }, []);

  return locale;
}

function priceFor(plan: SaasSalesPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return { regularPrice, finalPrice: regularPrice, discountPercent: 0, onSale: false };
  }
}

function money(value: number, currency: string, locale: Locale) {
  if (value === 0) return locale === 'ar' ? 'مجاني' : 'Free';
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function accessPeriod(period: BillingPeriod, locale: Locale) {
  const labels: Record<BillingPeriod, Copy> = {
    monthly: { en: 'Monthly access', ar: 'وصول شهري' },
    yearly: { en: 'Yearly access', ar: 'وصول سنوي' },
    lifetime: { en: 'Lifetime access', ar: 'وصول مدى الحياة' },
    one_time: { en: 'One-time access', ar: 'وصول لمرة واحدة' },
  };
  return text(labels[period], locale);
}

function paymentType(period: BillingPeriod, locale: Locale) {
  if (period === 'monthly' || period === 'yearly') {
    return locale === 'ar' ? 'يتم تأكيد جدول الدفع في Checkout' : 'Payment schedule confirmed at checkout';
  }
  return locale === 'ar' ? 'دفعة واحدة' : 'One-time payment';
}

function freeWorkspacePath(slug: SalesSlug) {
  return slug === 'summeca-invoiceflow'
    ? '/user-dashboard/invoiceflow'
    : '/user-dashboard/leadfollow';
}

export default function SaasProductSalesExperience({
  product,
  plans,
}: {
  product: SaasSalesProduct;
  plans: SaasSalesPlan[];
}) {
  const validSlug: SalesSlug | null = isSaasSalesSlug(product.slug) ? product.slug : null;
  const story = STORIES[validSlug ?? 'summeca-invoiceflow'];
  const locale = usePageLocale();
  const heroRef = useRef<HTMLElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const activePlans = useMemo(
    () => plans.filter((plan) => plan.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [plans],
  );
  const lowestPlan = useMemo(
    () => activePlans.reduce<SaasSalesPlan | null>((lowest, plan) => {
      if (!lowest) return plan;
      return priceFor(plan).finalPrice < priceFor(lowest).finalPrice ? plan : lowest;
    }, null),
    [activePlans],
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(lowestPlan?.id ?? null);

  useEffect(() => {
    if (!selectedPlanId || !activePlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(lowestPlan?.id ?? null);
    }
  }, [activePlans, lowestPlan, selectedPlanId]);

  useEffect(() => {
    trackFunnelEvent('product_view', {
      productId: product.id,
      productSlug: product.slug,
      source: 'saas_sales_page',
    });
  }, [product.id, product.slug]);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId) ?? lowestPlan;
  const selectedPricing = selectedPlan ? priceFor(selectedPlan) : null;
  const checkoutHref = selectedPlan
    ? `/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(selectedPlan.id)}`
    : '#plans';

  if (!validSlug) return null;

  const fallbackLabel = validSlug === 'summeca-invoiceflow' ? PREVIEW_FALLBACK.invoice : PREVIEW_FALLBACK.lead;

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <PublicNav />
      <main className="overflow-hidden pt-[68px]">
        <section ref={heroRef} className="relative border-b border-border bg-gradient-to-b from-primary/[0.08] via-background to-background">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-screen-xl items-start gap-7 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:px-8 lg:py-8">
            <div>
              <Link href="/saas" className="text-xs font-bold uppercase tracking-[0.18em] text-primary hover:underline">
                {text(UI.backToSaas, locale)}
              </Link>
              <p className="mt-3 text-sm font-bold text-foreground">{product.name}</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.035em] text-foreground sm:text-4xl lg:text-5xl">
                {text(story.headline, locale)}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{text(story.supportingCopy, locale)}</p>

              <div className="mt-4 rounded-2xl border border-primary/20 bg-card/90 p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{text(UI.whatYouGet, locale)}</p>
                <ul className="mt-2 space-y-2">
                  {story.buyerReceives.map((item) => (
                    <li key={item.en} className="flex items-start gap-2 text-sm leading-5 text-secondary-foreground">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                      <span>{text(item, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{text(UI.startingPrice, locale)}</p>
                  {selectedPlan && selectedPricing ? (
                    <>
                      <p className="mt-1 text-3xl font-black text-foreground">{money(selectedPricing.finalPrice, selectedPlan.currency, locale)}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {selectedPlan.name} · {selectedPlan.currency || 'USD'} · {accessPeriod(selectedPlan.billing_period, locale)} · {paymentType(selectedPlan.billing_period, locale)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{text(UI.noPlan, locale)}</p>
                  )}
                </div>
                <WishlistButton productId={product.id} productName={product.name} size="sm" />
              </div>
              <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{text(UI.checkoutConfirmation, locale)}</p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={freeWorkspacePath(validSlug)}
                  onClick={() => trackFunnelEvent('trial_started', { productId: product.id, productSlug: product.slug, source: 'hero' })}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#008f8c] bg-[#00a9a5] px-6 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,169,165,0.25)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#007f7c] hover:bg-[#008f8c] hover:shadow-[0_12px_30px_rgba(0,169,165,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008f8c] active:translate-y-0"
                >
                  {locale === 'ar' ? 'جرّب مجانًا' : 'Try free'} <ArrowRight size={15} />
                </Link>
                <Link href="#plans" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-primary/30 bg-card px-6 text-sm font-bold text-primary transition-colors hover:bg-primary/5">
                  {text(story.primaryCta, locale)}
                </Link>
                <Link href="#product-preview" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary">
                  {text(UI.seePreview, locale)}
                </Link>
              </div>
              <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
                {text(UI.trust, locale)}
              </p>
            </div>

            <div id="product-preview" aria-label={text(story.previewLabel, locale)} className="scroll-mt-24 lg:pt-1">
              <div className="aspect-video overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10">
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm font-semibold text-muted-foreground">
                  <span>{locale === 'ar' ? 'يتم تحميل معاينة المنتج الحقيقية…' : 'Loading the real product preview…'}</span>
                  <span className="sr-only">Fallback preview marker: {fallbackLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.howItWorks, locale)}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.threeSteps, locale)}</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {story.steps.map((step, index) => (
              <article key={step.title.en} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg motion-reduce:transform-none">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span>
                <h3 className="mt-5 text-lg font-bold text-foreground">{text(step.title, locale)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text(step.text, locale)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.whoFor, locale)}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.handsOn, locale)}</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {story.audiences.map((item) => {
                const Icon = item.icon ?? UserRound;
                return (
                  <article key={item.title.en} className="rounded-2xl border border-border bg-card p-5">
                    <Icon size={20} className="text-primary" />
                    <h3 className="mt-4 font-bold text-foreground">{text(item.title, locale)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text(item.text, locale)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.workflowLabel, locale)}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.workflowTitle, locale)}</h2>
            </div>
            <ol className="grid gap-3">
              {story.workflow.map((step, index) => (
                <li key={step.en} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-secondary-foreground">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>
                  <span>{text(step, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.capabilities, locale)}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.capabilitiesTitle, locale)} {product.name}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{text(UI.capabilitiesNote, locale)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {story.features.map((item) => {
                const Icon = item.icon ?? CheckCircle2;
                return (
                  <article key={item.title.en} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={19} /></div>
                    <h3 className="mt-4 font-bold text-foreground">{text(item.title, locale)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text(item.text, locale)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="plans" className="scroll-mt-20 bg-gradient-to-b from-primary/[0.045] to-background">
          <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.plansLabel, locale)}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.plansTitle, locale)}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(UI.plansNote, locale)}</p>
            </div>

            {activePlans.length === 0 ? (
              <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
                <p className="font-bold text-foreground">{text(UI.noPublishedPlan, locale)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{text(UI.checkoutUnavailable, locale)}</p>
              </div>
            ) : (
              <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan) => {
                  const price = priceFor(plan);
                  const selected = selectedPlan?.id === plan.id;
                  return (
                    <article key={plan.id} className={`flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition ${selected ? 'border-primary ring-2 ring-primary/15 shadow-primary/10' : 'border-border hover:border-primary/35'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">{accessPeriod(plan.billing_period, locale)} · {plan.currency || 'USD'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {selected && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{text(UI.selected, locale)}</span>}
                          {price.onSale && price.discountPercent > 0 && <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">{locale === 'ar' ? `وفر ${price.discountPercent}%` : `Save ${price.discountPercent}%`}</span>}
                        </div>
                      </div>
                      <div className="mt-5">
                        {price.onSale && <p className="text-xs text-muted-foreground line-through">{money(price.regularPrice, plan.currency, locale)}</p>}
                        <p className="text-4xl font-black tracking-tight text-foreground">{money(price.finalPrice, plan.currency, locale)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{paymentType(plan.billing_period, locale)}</p>
                      </div>
                      {plan.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>}
                      {(plan.features?.length ?? 0) > 0 && (
                        <ul className="mt-5 space-y-3">
                          {(plan.features ?? []).map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-secondary-foreground">
                              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button type="button" onClick={() => setSelectedPlanId(plan.id)} aria-pressed={selected} className="mt-5 min-h-10 rounded-xl border border-primary/25 bg-primary/5 px-4 text-sm font-bold text-primary transition hover:bg-primary/10">
                        {selected ? text(UI.selected, locale) : text(UI.selectPlan, locale)}
                      </button>
                      <Link
                        href={`/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(plan.id)}`}
                        onClick={() => trackFunnelEvent('buy_click', {
                          productId: product.id,
                          productSlug: product.slug,
                          planId: plan.id,
                          planName: plan.name,
                          amount: price.finalPrice,
                          currency: plan.currency,
                          source: 'plan_card',
                        })}
                        className="btn-primary mt-3 flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
                      >
                        {text(UI.continueWith, locale)} {plan.name} <ArrowRight size={14} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-4xl rounded-2xl border border-primary/20 bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.afterPurchase, locale)}</p>
                  <h2 className="mt-2 text-2xl font-black text-foreground">{text(UI.accountAccess, locale)}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(UI.deliveryCopy, locale)}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{text(UI.deliveryNote, locale)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(UI.faq, locale)}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{text(UI.faqTitle, locale)}</h2>
            </div>
            <div className="mt-8 space-y-3">
              {FAQS.map((item) => (
                <details key={item.question.en} className="group rounded-2xl border border-border bg-card p-5 open:border-primary/30">
                  <summary className="cursor-pointer list-none font-bold text-foreground">{text(item.question, locale)}</summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(item.answer, locale)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-20">
          <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-foreground px-6 py-12 text-center text-background sm:px-10">
            <div aria-hidden="true" className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text(story.eyebrow, locale)}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{text(story.finalHeadline, locale)}</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-background/70">{text(UI.finalCopy, locale)}</p>
              <Link href="#plans" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none">
                {text(story.primaryCta, locale)} <ArrowRight size={15} />
              </Link>
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-background/60">
                <Check size={14} className="text-primary" />
                {text(UI.verified, locale)}
              </div>
            </div>
          </div>
        </section>
      </main>

      {showSticky && selectedPlan && selectedPricing && (
        <aside aria-label={locale === 'ar' ? 'اختصار شراء المنتج' : 'Product purchase shortcut'} className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl border border-primary/25 bg-background/95 p-3 shadow-2xl backdrop-blur sm:inset-x-3 sm:bottom-5 sm:rounded-2xl sm:px-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-foreground">{product.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedPlan.name} · {money(selectedPricing.finalPrice, selectedPlan.currency, locale)} · {accessPeriod(selectedPlan.billing_period, locale)}</p>
            </div>
            <Link
              href={checkoutHref}
              onClick={() => trackFunnelEvent('buy_click', {
                productId: product.id,
                productSlug: product.slug,
                planId: selectedPlan.id,
                planName: selectedPlan.name,
                amount: selectedPricing.finalPrice,
                currency: selectedPlan.currency,
                source: 'sticky_checkout',
              })}
              className="btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 px-4 text-xs sm:text-sm"
            >
              {text(UI.buySelected, locale)} <ArrowRight size={14} />
            </Link>
          </div>
          <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{text(UI.secureLine, locale)}</p>
        </aside>
      )}

      <PublicFooter />
    </div>
  );
}
