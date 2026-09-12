import { translateUiText } from '@/lib/i18n-extra';

const PRODUCT_AR_TRANSLATIONS: Record<string, string> = {
  'Freelancer Client Management Kit': 'حزمة إدارة عملاء المستقلين',
  'Reusable client intake, proposal, scope, revision, email, tracking, invoice, delivery, and AI workflow templates for freelancers.': 'قوالب قابلة لإعادة الاستخدام لاستقبال العملاء والعروض ونطاق العمل والمراجعات والبريد والتتبع والفواتير والتسليم وسير العمل بالذكاء الاصطناعي للمستقلين.',
  'A reusable freelancer client-workflow kit with intake, project brief, proposal, scope-of-work, revision-policy and client-email templates, 100 AI client-management prompts, a client project tracker, invoice template, and delivery checklist. Delivered as a protected ZIP after verified payment. The materials are operational templates, not legal, tax, accounting, or financial advice.': 'حزمة متكاملة وقابلة لإعادة الاستخدام لإدارة سير عمل عملاء المستقلين، تتضمن نماذج استقبال العميل وملخص المشروع والعرض ونطاق العمل وسياسة المراجعات ورسائل البريد للعملاء، إضافة إلى 100 مطالبة بالذكاء الاصطناعي لإدارة العملاء، ومتتبع مشاريع العملاء، وقالب فاتورة، وقائمة تحقق للتسليم. تُسلَّم كملف ZIP محمي بعد التحقق من الدفع. هذه المواد قوالب تشغيلية وليست استشارة قانونية أو ضريبية أو محاسبية أو مالية.',

  'Ecommerce Product Page Conversion Kit': 'حزمة تحسين تحويل صفحات منتجات التجارة الإلكترونية',
  '100 AI prompts plus title, benefit, CTA, SEO, QA, example, and planning resources for clearer ecommerce product pages.': '100 مطالبة بالذكاء الاصطناعي مع موارد للعناوين والفوائد وعبارات الحث على الإجراء وSEO وضمان الجودة والأمثلة والتخطيط لإنشاء صفحات منتجات تجارة إلكترونية أوضح.',
  'A reusable ecommerce product-page copy toolkit with 100 AI prompts, 50 product-title formulas, 80 benefit-bullet templates, 60 CTA options, SEO and alt-text frameworks, a QA checklist, before-and-after examples, and an editable product-page planner. Delivered as a protected ZIP after verified payment. No conversion, ranking, revenue, or sales outcome is guaranteed.': 'مجموعة أدوات قابلة لإعادة الاستخدام لكتابة صفحات منتجات التجارة الإلكترونية، تضم 100 مطالبة بالذكاء الاصطناعي و50 صيغة لعناوين المنتجات و80 قالبًا لنقاط الفوائد و60 خيارًا لعبارات الحث على الإجراء، وأطر SEO والنص البديل، وقائمة تحقق لضمان الجودة، وأمثلة قبل وبعد، ومخططًا قابلًا للتعديل لصفحة المنتج. تُسلَّم كملف ZIP محمي بعد التحقق من الدفع. لا توجد ضمانات لنتائج التحويل أو الترتيب أو الإيرادات أو المبيعات.',

  'AI Social Media Content Kit': 'حزمة محتوى وسائل التواصل بالذكاء الاصطناعي',
  '300 AI prompts, 120 hooks, 80 CTA goals, platform frameworks, brand-voice worksheet, and a 30-day content planner.': '300 مطالبة بالذكاء الاصطناعي و120 خطافًا و80 هدفًا لعبارات الحث على الإجراء، وأطرًا للمنصات، وورقة عمل لصوت العلامة التجارية، ومخطط محتوى لمدة 30 يومًا.',
  'A reusable social-content workflow with 300 AI prompts, 120 hooks, 80 CTA goals, platform frameworks, a 30-day editable content planner, and a brand-voice worksheet. Delivered as a protected ZIP after verified payment. No reach, follower, engagement, virality, revenue, or sales outcome is guaranteed.': 'سير عمل قابل لإعادة الاستخدام للمحتوى الاجتماعي يضم 300 مطالبة بالذكاء الاصطناعي و120 خطافًا و80 هدفًا لعبارات الحث على الإجراء وأطرًا للمنصات ومخطط محتوى قابلًا للتعديل لمدة 30 يومًا وورقة عمل لصوت العلامة التجارية. يُسلَّم كملف ZIP محمي بعد التحقق من الدفع. لا توجد ضمانات للوصول أو عدد المتابعين أو التفاعل أو الانتشار أو الإيرادات أو المبيعات.',

  'SUMMECA LeadFollow AI': 'SUMMECA LeadFollow AI',
  'Track leads and generate focused AI follow-up drafts without losing the next action.': 'تتبّع العملاء المحتملين وأنشئ مسودات متابعة مركزة بالذكاء الاصطناعي دون فقدان الخطوة التالية.',
  'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts for email, LinkedIn, WhatsApp, SMS, and general follow-up. LeadFollow AI never sends messages automatically and never invents testimonials, guarantees, discounts, or business facts.': 'نظّم العملاء المحتملين وجدول المتابعات وأدر حالة مسار المبيعات وأنشئ مسودات تواصل واقعية بمساعدة الذكاء الاصطناعي للبريد الإلكتروني وLinkedIn وWhatsApp والرسائل النصية والمتابعة العامة. لا يرسل LeadFollow AI الرسائل تلقائيًا ولا يختلق شهادات أو ضمانات أو خصومات أو معلومات تجارية.',

  'SUMMECA InvoiceFlow': 'SUMMECA InvoiceFlow',
  'Create invoices, track payment status, manage clients, and keep billing organized in one focused workspace.': 'أنشئ الفواتير وتتبّع حالة الدفع وأدر العملاء وحافظ على تنظيم الفوترة في مساحة عمل واحدة مركزة.',
  'Create professional invoices, manage clients, track payment status, calculate totals and tax, prepare reminders, export records, and save invoices as PDF from one focused workspace. InvoiceFlow is a self-serve SUMMECA SaaS application; customers use it directly after verified purchase.': 'أنشئ فواتير احترافية وأدر العملاء وتتبّع حالة الدفع واحسب الإجماليات والضرائب وجهّز التذكيرات وصدّر السجلات واحفظ الفواتير بصيغة PDF من مساحة عمل واحدة. InvoiceFlow تطبيق SaaS ذاتي الخدمة من SUMMECA ويستخدمه العملاء مباشرة بعد التحقق من الشراء.',

  'SUMMECA Conversion Rescue Kit — Starter': 'SUMMECA Conversion Rescue Kit — Starter',
  'Audit one landing page, identify the biggest friction points, and build a clear improvement plan with an interactive workspace.': 'راجع صفحة هبوط واحدة وحدد أكبر نقاط الاحتكاك وابنِ خطة تحسين واضحة باستخدام مساحة عمل تفاعلية.',
  'A practical landing-page optimization starter kit with a 30-point conversion audit, 20 AI prompts, a secure interactive Conversion Rescue Workspace, and a commercial-use license. Built for business owners, freelancers, and marketers who want a clear, repeatable way to find conversion friction and improve one landing page without guesswork. This toolkit does not guarantee sales, leads, or conversion-rate increases; results depend on the offer, traffic, implementation, and testing.': 'حزمة بداية عملية لتحسين صفحات الهبوط تتضمن تدقيق تحويل من 30 نقطة و20 مطالبة بالذكاء الاصطناعي ومساحة عمل Conversion Rescue تفاعلية وآمنة وترخيصًا للاستخدام التجاري. صُممت لأصحاب الأعمال والمستقلين والمسوقين الذين يريدون طريقة واضحة وقابلة للتكرار لاكتشاف عوائق التحويل وتحسين صفحة هبوط واحدة دون تخمين. لا تضمن هذه الحزمة المبيعات أو العملاء المحتملين أو زيادة معدل التحويل؛ فالنتائج تعتمد على العرض والزيارات والتنفيذ والاختبار.',

  'SUMMECA Conversion Rescue Kit — Pro': 'SUMMECA Conversion Rescue Kit — Pro',
  'A reusable conversion toolkit with editable templates, AI prompts, CTA library, follow-up scripts, scorecard, and interactive workspace.': 'مجموعة أدوات تحويل قابلة لإعادة الاستخدام تتضمن قوالب قابلة للتعديل ومطالبات بالذكاء الاصطناعي ومكتبة عبارات حث على الإجراء ونصوص متابعة وبطاقة تقييم ومساحة عمل تفاعلية.',
  'A complete landing-page optimization toolkit that combines a 30-point conversion audit, editable landing-page template, 20 AI prompts, an 80-CTA library, follow-up scripts, an interactive Excel scorecard, and the secure Conversion Rescue Workspace. Designed for freelancers, marketers, agencies, and small teams that need a reusable system for reviewing and improving landing pages. No performance outcome is guaranteed.': 'مجموعة متكاملة لتحسين صفحات الهبوط تجمع تدقيق تحويل من 30 نقطة وقالب صفحة هبوط قابلًا للتعديل و20 مطالبة بالذكاء الاصطناعي ومكتبة من 80 عبارة حث على الإجراء ونصوص متابعة وبطاقة تقييم تفاعلية في Excel ومساحة عمل Conversion Rescue الآمنة. صُممت للمستقلين والمسوقين والوكالات والفرق الصغيرة التي تحتاج إلى نظام قابل لإعادة الاستخدام لمراجعة صفحات الهبوط وتحسينها. لا توجد ضمانات لنتائج الأداء.',

  'SUMMECA Conversion Rescue Kit — Ultimate': 'SUMMECA Conversion Rescue Kit — Ultimate',
  'The complete Conversion Rescue system with the full toolkit, training examples, and a ready-to-edit responsive landing-page template.': 'نظام Conversion Rescue الكامل مع مجموعة الأدوات الكاملة وأمثلة تدريبية وقالب صفحة هبوط متجاوب جاهز للتعديل.',
  'The full SUMMECA landing-page optimization system. Includes the complete Pro toolkit plus six before-and-after training examples and a ready-to-edit responsive landing-page HTML template. It gives buyers both a structured analysis workflow and tangible implementation assets they can customize for real projects. The examples are fictional training material and are not presented as client results. No performance outcome is guaranteed.': 'نظام SUMMECA الكامل لتحسين صفحات الهبوط. يتضمن مجموعة Pro الكاملة بالإضافة إلى ستة أمثلة تدريبية قبل وبعد وقالب HTML متجاوب لصفحة هبوط جاهز للتعديل. يمنح المشترين سير عمل تحليليًا منظمًا وأصول تنفيذ عملية يمكن تخصيصها للمشاريع الحقيقية. الأمثلة مواد تدريبية افتراضية وليست نتائج عملاء. لا توجد ضمانات لنتائج الأداء.',

  'Complete Kit': 'الحزمة الكاملة',
  'Starter': 'المبتدئة',
  'Pro': 'الاحترافية',
  'Agency': 'الوكالات',
  'Ultimate': 'المتكاملة',
  'one time': 'مرة واحدة',
  'one-time': 'مرة واحدة',
  'template': 'قالب',
  'ai tool': 'أداة ذكاء اصطناعي',
  'other': 'أخرى',
};

const NORMALIZED_PRODUCTS = new Map(
  Object.entries(PRODUCT_AR_TRANSLATIONS).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

export function translateSiteText(value: string): string {
  const uiTranslation = translateUiText(value);
  if (uiTranslation !== value) return uiTranslation;
  if (!value || !/[A-Za-z]/.test(value)) return value;

  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = value.match(/\s*$/)?.[0] ?? '';
  const coreEnd = Math.max(leadingWhitespace.length, value.length - trailingWhitespace.length);
  const core = value.slice(leadingWhitespace.length, coreEnd);
  const translated = PRODUCT_AR_TRANSLATIONS[core] ?? NORMALIZED_PRODUCTS.get(core.toLocaleLowerCase('en'));

  return translated ? `${leadingWhitespace}${translated}${trailingWhitespace}` : value;
}
