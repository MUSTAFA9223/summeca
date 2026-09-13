import { translateComprehensiveText } from '@/lib/i18n-comprehensive';

const SURFACE_AR_TRANSLATIONS: Record<string, string> = {
  // Product catalog pages
  'SUMMECA Catalog': 'كتالوج SUMMECA',
  'Published digital products': 'المنتجات الرقمية المنشورة',
  'Browse only production offers currently published by SUMMECA. Prices, currencies, billing periods, and sale pricing come directly from the active product plans used at checkout.': 'تصفح عروض الإنتاج المنشورة حاليًا من SUMMECA فقط. تأتي الأسعار والعملات وفترات الفوترة وأسعار العروض مباشرة من خطط المنتجات النشطة المستخدمة عند الدفع.',
  'AI products published by SUMMECA': 'منتجات الذكاء الاصطناعي المنشورة من SUMMECA',
  'Explore AI tools, APIs, and plugins that are currently published. A product appears here only when it has an active production offer.': 'استكشف أدوات الذكاء الاصطناعي وواجهات API والإضافات المنشورة حاليًا. لا يظهر المنتج هنا إلا عندما يكون لديه عرض إنتاج نشط.',
  'SaaS Applications': 'تطبيقات SaaS',
  'Software offers ready for customers': 'عروض برمجية جاهزة للعملاء',
  'Browse SaaS and related software products that are currently published. Pricing and billing periods are taken from the same active plans used at checkout.': 'تصفح منتجات SaaS والبرمجيات ذات الصلة المنشورة حاليًا. تؤخذ الأسعار وفترات الفوترة من الخطط النشطة نفسها المستخدمة عند الدفع.',
  'Digital resources ready for delivery': 'موارد رقمية جاهزة للتسليم',
  'Browse digital products currently published by SUMMECA. Free labels appear only for real zero-price offers, and paid pricing comes directly from active checkout plans.': 'تصفح المنتجات الرقمية المنشورة حاليًا من SUMMECA. تظهر علامة مجاني فقط للعروض الحقيقية ذات السعر صفر، وتأتي الأسعار المدفوعة مباشرة من خطط الدفع النشطة.',
  'Deep 3D product previews': 'معاينات منتجات ثلاثية الأبعاد متقدمة',
  'Protected checkout': 'دفع محمي',
  'Dedicated landing pages': 'صفحات هبوط مخصصة',
  'Search published products': 'ابحث في المنتجات المنشورة',
  'Sort products': 'ترتيب المنتجات',
  'AI': 'ذكاء اصطناعي',
  'SaaS': 'SaaS',
  'Digital': 'رقمي',
  'Featured': 'مميز',
  'Newest': 'الأحدث',
  'Price: low to high': 'السعر: من الأقل إلى الأعلى',
  'Price: high to low': 'السعر: من الأعلى إلى الأقل',
  'SUMMECA Product': 'منتج SUMMECA',
  'Product': 'منتج',
  'Starting at': 'ابتداءً من',
  'No active offer': 'لا يوجد عرض نشط',
  'View landing': 'عرض صفحة المنتج',
  'The catalog could not be loaded. Please try again.': 'تعذر تحميل الكتالوج. حاول مرة أخرى.',
  'No published offers yet': 'لا توجد عروض منشورة بعد',
  'SUMMECA is preparing its next production products. Only active publishable offers appear here.': 'تجهز SUMMECA منتجاتها التالية للإنتاج. لا تظهر هنا إلا العروض النشطة القابلة للنشر.',
  'Explore the complete product landing page, included assets and current offer.': 'استكشف صفحة المنتج الكاملة والأصول المضمنة والعرض الحالي.',

  // Pricing catalog
  'Published Pricing': 'الأسعار المنشورة',
  'Real offers. No placeholder tiers.': 'عروض حقيقية. بلا خطط تجريبية وهمية.',
  'Every price on this page comes from an active SUMMECA product plan and is the same plan used by checkout.': 'كل سعر في هذه الصفحة يأتي من خطة منتج نشطة في SUMMECA وهي نفس الخطة المستخدمة عند الدفع.',
  'Published pricing could not be loaded. Please try again.': 'تعذر تحميل الأسعار المنشورة. حاول مرة أخرى.',
  'No production pricing is published yet': 'لم تُنشر أسعار إنتاج حتى الآن',
  'The previous demo tiers have been removed. The first real product and its active plan will appear here automatically after it is reviewed and published.': 'تمت إزالة الخطط التجريبية السابقة. سيظهر أول منتج حقيقي وخطته النشطة هنا تلقائيًا بعد مراجعته ونشره.',
  'Open product catalog': 'فتح كتالوج المنتجات',
  'Monthly access': 'وصول شهري',
  'Yearly access': 'وصول سنوي',
  'One-time': 'مرة واحدة',
  'Review this offer': 'مراجعة هذا العرض',
  'Monthly and yearly labels describe the plan period shown by SUMMECA. Automatic renewal applies only when checkout and the payment provider explicitly state that a recurring billing agreement is being created. Access is granted only after a free order is completed or a paid transaction is verified server-side.': 'توضح التسميات الشهرية والسنوية مدة الخطة المعروضة من SUMMECA. لا ينطبق التجديد التلقائي إلا عندما يوضح الدفع ومزود الدفع صراحة إنشاء اتفاق فوترة متكررة. ولا يُمنح الوصول إلا بعد إكمال طلب مجاني أو التحقق من معاملة مدفوعة على الخادم.',

  // Customer dashboard overview
  'SUMMECA Dashboard': 'لوحة تحكم SUMMECA',
  'Welcome back,': 'مرحبًا بعودتك،',
  'This dashboard shows only data linked to your signed-in account.': 'تعرض هذه اللوحة فقط البيانات المرتبطة بحسابك المسجل.',
  'Explore Products': 'استكشف المنتجات',
  'Some account data is temporarily unavailable. Please refresh in a moment.': 'بعض بيانات الحساب غير متاحة مؤقتًا. حدّث الصفحة بعد قليل.',
  'Loading your account data...': 'جارٍ تحميل بيانات حسابك...',
  'Active Products': 'المنتجات النشطة',
  'Purchased or currently subscribed': 'مشتراة أو مشترك بها حاليًا',
  'AI Requests This Month': 'طلبات الذكاء الاصطناعي هذا الشهر',
  'No AI usage recorded': 'لم يُسجل استخدام للذكاء الاصطناعي',
  'Total Spend': 'إجمالي الإنفاق',
  'Completed orders only': 'الطلبات المكتملة فقط',
  'Available Downloads': 'التنزيلات المتاحة',
  'Files currently available to this account': 'الملفات المتاحة حاليًا لهذا الحساب',
  'View all →': 'عرض الكل ←',
  'Purchases for this account will appear here.': 'ستظهر مشتريات هذا الحساب هنا.',
  'Manage all →': 'إدارة الكل ←',
  'Only subscriptions owned by this account are shown.': 'تظهر فقط الاشتراكات المملوكة لهذا الحساب.',
  'All downloads →': 'كل التنزيلات ←',
  'No downloads available': 'لا توجد تنزيلات متاحة',
  'Purchased files for this account will appear here.': 'ستظهر الملفات المشتراة لهذا الحساب هنا.',
  'File': 'ملف',
  'available': 'متاح',
  'completed': 'مكتمل',
  'active': 'نشط',
  'trialing': 'فترة تجريبية',

  // SaaS sales pages
  'Invoice workspace': 'مساحة عمل الفواتير',
  'Create professional invoices in minutes, not spreadsheets.': 'أنشئ فواتير احترافية خلال دقائق بدلًا من جداول البيانات.',
  'Manage clients, create invoices, track billing and keep your invoice workflow organized from one workspace.': 'أدر العملاء وأنشئ الفواتير وتتبّع الفوترة ونظّم سير عمل الفواتير من مساحة عمل واحدة.',
  'Start building better invoices with SUMMECA InvoiceFlow.': 'ابدأ بإنشاء فواتير أفضل مع SUMMECA InvoiceFlow.',
  'Choose an InvoiceFlow plan': 'اختر خطة InvoiceFlow',
  'InvoiceFlow sample workspace': 'مساحة عمل تجريبية لـ InvoiceFlow',
  'Add your client': 'أضف عميلك',
  'Keep the client details you need for billing in one place.': 'احتفظ بتفاصيل العميل اللازمة للفوترة في مكان واحد.',
  'Create the invoice': 'أنشئ الفاتورة',
  'Add line items, dates, tax, notes and terms in a focused builder.': 'أضف البنود والتواريخ والضريبة والملاحظات والشروط في منشئ مركّز.',
  'Manage and send your workflow': 'أدر سير العمل وأرسله',
  'Update status, enable a share link, print or save the invoice as PDF.': 'حدّث الحالة وفعّل رابط المشاركة واطبع الفاتورة أو احفظها بصيغة PDF.',
  'Freelancers': 'المستقلون',
  'Create and track invoices without maintaining a spreadsheet.': 'أنشئ الفواتير وتتبّعها دون الحاجة إلى إدارة جدول بيانات.',
  'Consultants': 'المستشارون',
  'Keep client billing details and invoice status organized.': 'حافظ على تنظيم تفاصيل فوترة العملاء وحالة الفواتير.',
  'Agencies': 'الوكالات',
  'Handle higher client and invoice volumes with plan-based limits.': 'تعامل مع أعداد أكبر من العملاء والفواتير وفق حدود الخطة.',
  'Small businesses': 'الشركات الصغيرة',
  'Use one workspace for clients, invoices and billing summaries.': 'استخدم مساحة عمل واحدة للعملاء والفواتير وملخصات الفوترة.',
  'Client records': 'سجلات العملاء',
  'Store client contact and billing details in your private account workspace.': 'احفظ بيانات تواصل العملاء وفوترتهم في مساحة حسابك الخاصة.',
  'Invoice builder': 'منشئ الفواتير',
  'Create itemized invoices with dates, tax, notes, terms and automatic totals.': 'أنشئ فواتير مفصلة بالتواريخ والضريبة والملاحظات والشروط والإجماليات التلقائية.',
  'Status tracking': 'تتبّع الحالة',
  'Move invoices through draft, sent, paid or cancelled states.': 'نقّل الفواتير بين حالات المسودة والمُرسلة والمدفوعة والملغاة.',
  'Billing overview': 'نظرة عامة على الفوترة',
  'See paid, outstanding and overdue summaries from your invoice data.': 'شاهد ملخصات المدفوع والمستحق والمتأخر من بيانات فواتيرك.',
  'Share and PDF workflow': 'المشاركة وسير عمل PDF',
  'Enable a protected invoice link, then print or save the invoice as PDF.': 'فعّل رابط فاتورة محميًا، ثم اطبع الفاتورة أو احفظها بصيغة PDF.',
  'Exports and reminders': 'التصدير والتذكيرات',
  'Eligible plans include CSV export and ready-to-send payment reminder text.': 'تتضمن الخطط المؤهلة تصدير CSV ونصوص تذكير بالدفع جاهزة للإرسال.',
  'Lead follow-up workspace': 'مساحة عمل متابعة العملاء المحتملين',
  'Turn new leads into better follow-ups, faster.': 'حوّل العملاء المحتملين الجدد إلى متابعات أفضل وبسرعة أكبر.',
  'Organize leads, prepare follow-up messages and keep sales conversations moving from one workspace.': 'نظّم العملاء المحتملين وجهّز رسائل المتابعة وحافظ على تقدم محادثات المبيعات من مساحة عمل واحدة.',
  'Organize your leads and move every follow-up forward.': 'نظّم عملاءك المحتملين وادفع كل متابعة إلى الأمام.',
  'Choose a LeadFollow AI plan': 'اختر خطة LeadFollow AI',
  'LeadFollow AI sample workspace': 'مساحة عمل تجريبية لـ LeadFollow AI',
  'Record the contact details, source and factual notes you already know.': 'سجّل بيانات التواصل والمصدر والملاحظات الواقعية التي تعرفها.',
  'Organize the opportunity': 'نظّم الفرصة',
  'Set its pipeline status and schedule the next follow-up.': 'حدد حالة مسارها وجدول المتابعة التالية.',
  'Prepare the next follow-up': 'جهّز المتابعة التالية',
  'Generate a grounded draft, review it, edit it and send it through your own channel.': 'أنشئ مسودة مبنية على الحقائق وراجعها وعدّلها ثم أرسلها عبر قناتك.',
  'Keep prospects and next actions visible in one workflow.': 'احتفظ بالعملاء المحتملين والخطوات التالية ظاهرة في سير عمل واحد.',
  'Organize larger lead lists with plan-based limits.': 'نظّم قوائم أكبر من العملاء المحتملين وفق حدود الخطة.',
  'Service businesses': 'شركات الخدمات',
  'Prepare consistent follow-ups using your real offer and context.': 'جهّز متابعات متسقة باستخدام عرضك وسياقك الحقيقي.',
  'Small sales teams': 'فرق المبيعات الصغيرة',
  'Track pipeline status, due follow-ups and saved draft history.': 'تتبّع حالة المسار والمتابعات المستحقة وسجل المسودات المحفوظة.',
  'Lead pipeline': 'مسار العملاء المحتملين',
  'Track new, contacted, replied, won and lost opportunities.': 'تتبّع الفرص الجديدة والتي تم التواصل معها والرد عليها والمكتسبة والمفقودة.',
  'Follow-up scheduling': 'جدولة المتابعة',
  'Save the next follow-up time and see which opportunities are due.': 'احفظ موعد المتابعة التالية وشاهد الفرص المستحقة.',
  'AI-assisted drafts': 'مسودات بمساعدة الذكاء الاصطناعي',
  'Prepare editable messages grounded in the business and lead context you provide.': 'جهّز رسائل قابلة للتعديل مبنية على سياق النشاط والعميل المحتمل الذي تقدمه.',
  'Channel controls': 'خيارات القنوات',
  'Create drafts for email, LinkedIn, WhatsApp, SMS or a generic channel.': 'أنشئ مسودات للبريد الإلكتروني وLinkedIn وWhatsApp وSMS أو قناة عامة.',
  'Tone and language controls': 'خيارات النبرة واللغة',
  'Choose the stage, tone and supported output language for each draft.': 'اختر المرحلة والنبرة ولغة الإخراج المدعومة لكل مسودة.',
  'Message history': 'سجل الرسائل',
  'Keep generated drafts attached to the relevant lead for later review and copying.': 'احتفظ بالمسودات المنشأة مرتبطة بالعميل المحتمل لمراجعتها ونسخها لاحقًا.',
  'Current starting price': 'السعر الحالي يبدأ من',
  'No active plan is currently available.': 'لا توجد خطة نشطة متاحة حاليًا.',
  'See the product preview': 'شاهد معاينة المنتج',
  'After verified payment, access is unlocked in your SUMMECA account.': 'بعد التحقق من الدفع، يتم فتح الوصول في حساب SUMMECA الخاص بك.',
  'How it works': 'كيف يعمل',
  'From setup to the next action in three steps': 'من الإعداد إلى الخطوة التالية في ثلاث مراحل',
  'Who it is for': 'لمن صُمم',
  'A focused workspace for hands-on operators': 'مساحة عمل مركزة لمن يديرون العمل فعليًا',
  'Real product capabilities': 'قدرات المنتج الفعلية',
  'These capabilities reflect the current SUMMECA workspace. Limits and availability vary by the active plan shown below.': 'تعكس هذه القدرات مساحة عمل SUMMECA الحالية. تختلف الحدود والتوفر بحسب الخطة النشطة الموضحة أدناه.',
  'Plans and limits': 'الخطط والحدود',
  'Choose the access level that fits your workflow': 'اختر مستوى الوصول المناسب لسير عملك',
  'Prices, currencies, access periods and included limits below come from the active plans used by SUMMECA checkout.': 'تأتي الأسعار والعملات ومدد الوصول والحدود المضمنة أدناه من الخطط النشطة المستخدمة في دفع SUMMECA.',
  'No active plan is available right now.': 'لا توجد خطة نشطة متاحة الآن.',
  'Checkout remains unavailable until a production plan is published.': 'يبقى الدفع غير متاح حتى يتم نشر خطة إنتاج.',
  'Account access after payment': 'الوصول إلى الحساب بعد الدفع',
  'After verified payment, access is unlocked in your SUMMECA account. Access belongs to the account used at checkout and unlocks only after the payment is confirmed. This SaaS product is used inside your dashboard; it is not delivered as a downloadable ZIP.': 'بعد التحقق من الدفع، يتم فتح الوصول في حساب SUMMECA. يرتبط الوصول بالحساب المستخدم عند الدفع ولا يُفتح إلا بعد تأكيد الدفع. يُستخدم منتج SaaS هذا داخل لوحة التحكم ولا يُسلّم كملف ZIP قابل للتنزيل.',
  'Monthly and yearly labels, when present, describe the access period. Recurring billing applies only if checkout explicitly says a recurring agreement is being created.': 'توضح التسميات الشهرية والسنوية، عند وجودها، مدة الوصول. لا تنطبق الفوترة المتكررة إلا إذا أوضحت صفحة الدفع صراحة إنشاء اتفاق متكرر.',
  'SAMPLE DATA': 'بيانات تجريبية',
  'Sample invoice': 'فاتورة تجريبية',
  'Sample Client': 'عميل تجريبي',
  'Demo Project': 'مشروع تجريبي',
  'Sample Lead': 'عميل محتمل تجريبي',
  'Demo Inquiry': 'استفسار تجريبي',
  'Website form': 'نموذج الموقع',
  'AI draft example — review before sending': 'مثال لمسودة بالذكاء الاصطناعي — راجعها قبل الإرسال',
  'Copy draft': 'نسخ المسودة',
};

const NORMALIZED_SURFACES = new Map(
  Object.entries(SURFACE_AR_TRANSLATIONS).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

function translateDynamicSurface(core: string): string | null {
  let match = core.match(/^(\d+) currencies$/i);
  if (match) return `${match[1]} عملات`;

  match = core.match(/^(\d+) of (\d+) used$/i);
  if (match) return `تم استخدام ${match[1]} من ${match[2]}`;

  match = core.match(/^Renews (.+)$/i);
  if (match) return `يتجدد ${match[1]}`;

  match = core.match(/^(\d+) downloads$/i);
  if (match) return `${match[1]} تنزيلات`;

  match = core.match(/^Save (\d+)%$/i);
  if (match) return `وفر ${match[1]}%`;

  match = core.match(/^Choose (.+)$/i);
  if (match) return `اختر ${match[1]}`;

  match = core.match(/^What you can do in (.+)$/i);
  if (match) return `ما الذي يمكنك فعله في ${match[1]}`;

  match = core.match(/^(\d+) sample$/i);
  if (match) return `${match[1]} تجريبي`;

  match = core.match(/^(\d+) sample leads$/i);
  if (match) return `${match[1]} عملاء محتملون تجريبيون`;

  match = core.match(/^(\d+) invoices$/i);
  if (match) return `${match[1]} فواتير`;

  match = core.match(/^Next follow-up:\s*(.+)$/i);
  if (match) return `المتابعة التالية: ${match[1]}`;

  return null;
}

export function translateSurfaceText(value: string): string {
  if (!value || !/[A-Za-z]/.test(value)) return value;
  const base = translateComprehensiveText(value);
  if (base !== value) return base;

  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  const core = value.slice(leading.length, Math.max(leading.length, value.length - trailing.length));
  const translated = SURFACE_AR_TRANSLATIONS[core]
    ?? NORMALIZED_SURFACES.get(core.toLocaleLowerCase('en'))
    ?? translateDynamicSurface(core);

  return translated ? `${leading}${translated}${trailing}` : value;
}
