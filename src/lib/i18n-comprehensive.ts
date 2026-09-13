import { translateUiText } from '@/lib/i18n-extra';

const COMPREHENSIVE_AR_TRANSLATIONS: Record<string, string> = {
  // Authentication shell
  'Interactive workspace': 'مساحة عمل تفاعلية',
  'Your digital': 'عالمك الرقمي',
  'world,': 'جاهز،',
  'ready': 'دائمًا',
  'when you': 'عندما',
  'are.': 'تحتاجه.',
  'Sign in to access your SUMMECA tools, products and workspace from one secure place.': 'سجّل الدخول للوصول إلى أدوات SUMMECA ومنتجاتك ومساحة عملك من مكان آمن واحد.',
  'Welcome to SUMMECA': 'مرحبًا بك في SUMMECA',
  'Back to login': 'العودة لتسجيل الدخول',

  // Checkout and payment
  'Secure Checkout': 'دفع آمن',
  'Cryptocurrency is the only payment method currently shown at SUMMECA. Payment return pages never complete paid orders.': 'العملات الرقمية هي طريقة الدفع المعروضة حاليًا في SUMMECA. صفحات العودة من الدفع لا تُكمل الطلبات المدفوعة تلقائيًا.',
  'SUMMECA recalculates pricing server-side and grants access only after trusted payment verification.': 'تعيد SUMMECA حساب السعر على الخادم ولا تمنح الوصول إلا بعد التحقق الموثوق من الدفع.',
  'Checkout could not be loaded.': 'تعذر تحميل صفحة الدفع.',
  'Back to products': 'العودة إلى المنتجات',
  'Your Order': 'طلبك',
  'AI Tool': 'أداة ذكاء اصطناعي',
  'API': 'واجهة API',
  'Plugin': 'إضافة',
  'Template': 'قالب',
  'Dataset': 'مجموعة بيانات',
  'Course': 'دورة',
  'Other': 'أخرى',
  'One-time purchase': 'شراء لمرة واحدة',
  '1-month access': 'وصول لمدة شهر',
  '1-year access': 'وصول لمدة سنة',
  'Lifetime access': 'وصول مدى الحياة',
  'Access Period': 'مدة الوصول',
  '1 Month': 'شهر واحد',
  '1 Year': 'سنة واحدة',
  'These options describe the paid access period. They do not promise automatic renewal unless a payment provider explicitly presents a recurring agreement.': 'توضح هذه الخيارات مدة الوصول المدفوع، ولا تعني تجديدًا تلقائيًا ما لم يعرض مزود الدفع اتفاقًا متكررًا بشكل صريح.',
  'Payment Method': 'طريقة الدفع',
  'Cryptocurrency · USDT / USDC / TRX / BNB': 'عملات رقمية · USDT / USDC / TRX / BNB',
  'Crypto-only checkout through NOWPayments. Choose the exact asset and network below; provider minimums are checked live before a payment is created.': 'الدفع بالعملات الرقمية فقط عبر NOWPayments. اختر العملة والشبكة بدقة أدناه؛ ويتم التحقق مباشرة من الحد الأدنى لدى المزود قبل إنشاء عملية الدفع.',
  'Available': 'متاح',
  'Checking…': 'جارٍ التحقق…',
  'Checking...': 'جارٍ التحقق...',
  'Not configured': 'غير مُهيأ',
  'Amount to send': 'المبلغ المطلوب إرساله',
  'Payment address': 'عنوان الدفع',
  'Copy payment address': 'نسخ عنوان الدفع',
  'Send only': 'أرسل فقط',
  'on the selected network. Sending another asset or the wrong network can result in permanent loss. SUMMECA waits for the verified provider webhook before granting access.': 'على الشبكة المحددة. إرسال أصل آخر أو استخدام شبكة خاطئة قد يؤدي إلى فقدان دائم. تنتظر SUMMECA إشعار المزود الموثق قبل منح الوصول.',
  'Coupon Code': 'رمز الخصم',
  'Enter coupon code': 'أدخل رمز الخصم',
  'Apply': 'تطبيق',
  'Order Summary': 'ملخص الطلب',
  'Regular price': 'السعر الأساسي',
  'Sale discount': 'خصم العرض',
  'Coupon discount': 'خصم القسيمة',
  'Payment success pages are informational only. Paid access is granted by verified server-side events.': 'صفحات نجاح الدفع معلوماتية فقط. يُمنح الوصول المدفوع بعد أحداث موثقة على الخادم.',
  'Sign in to continue.': 'سجّل الدخول للمتابعة.',
  'Sign In to Continue': 'سجّل الدخول للمتابعة',
  'Get Free Access': 'احصل على وصول مجاني',
  'No payment information required': 'لا يلزم إدخال معلومات دفع',
  'Crypto payment details are handled by the provider and never stored by SUMMECA': 'يتولى مزود الدفع معالجة تفاصيل العملات الرقمية ولا تخزنها SUMMECA',
  '← Back to product': 'العودة إلى المنتج →',
  'No product selected. Choose a product before starting checkout.': 'لم يتم اختيار منتج. اختر منتجًا قبل بدء الدفع.',
  'Product not found or unavailable.': 'المنتج غير موجود أو غير متاح.',
  'No active plans found for this product.': 'لا توجد خطط نشطة لهذا المنتج.',
  'Failed to load checkout details.': 'تعذر تحميل تفاصيل الدفع.',
  'Coupon code not found or unavailable.': 'رمز الخصم غير موجود أو غير متاح.',
  'Failed to validate coupon.': 'تعذر التحقق من رمز الخصم.',
  'Failed to start checkout.': 'تعذر بدء عملية الدفع.',
  'Failed to start checkout. Please try again.': 'تعذر بدء عملية الدفع. حاول مرة أخرى.',
  'Crypto provider returned incomplete payment details.': 'أعاد مزود العملات الرقمية تفاصيل دفع غير مكتملة.',
  'Payment provider did not return a checkout URL.': 'لم يُرجع مزود الدفع رابطًا لصفحة الدفع.',

  // Dashboard chrome
  'Main': 'الرئيسية',
  'My Products': 'منتجاتي',
  'SUMMECA Apps': 'تطبيقات SUMMECA',
  'Billing & Usage': 'الفوترة والاستخدام',
  'InvoiceFlow': 'InvoiceFlow',
  'LeadFollow AI': 'LeadFollow AI',
  'AI Usage': 'استخدام الذكاء الاصطناعي',
  'API Keys': 'مفاتيح API',
  'User': 'المستخدم',
  'Loading...': 'جارٍ التحميل...',
  'Log out': 'تسجيل الخروج',
  'Expand sidebar': 'توسيع الشريط الجانبي',
  'Collapse sidebar': 'طي الشريط الجانبي',
  'Expand': 'توسيع',
  'Collapse': 'طي',
  'Open sidebar': 'فتح الشريط الجانبي',
  'Open menu': 'فتح القائمة',
  'Search products, orders...': 'ابحث في المنتجات والطلبات...',
  'Signed out successfully': 'تم تسجيل الخروج بنجاح',
  'Signed out': 'تم تسجيل الخروج',
  'Failed to sign out': 'تعذر تسجيل الخروج',
  'Loading your dashboard...': 'جارٍ تحميل لوحة التحكم...',
  'Profile': 'الملف الشخصي',

  // Customer dashboard/common account UI
  'My Account': 'حسابي',
  'Welcome back!': 'مرحبًا بعودتك!',
  'Recent Orders': 'الطلبات الأخيرة',
  'Recent orders': 'الطلبات الأخيرة',
  'Active Subscriptions': 'الاشتراكات النشطة',
  'Active subscriptions': 'الاشتراكات النشطة',
  'Purchased Products': 'المنتجات المشتراة',
  'Purchased products': 'المنتجات المشتراة',
  'Account Settings': 'إعدادات الحساب',
  'Personal information': 'المعلومات الشخصية',
  'Change password': 'تغيير كلمة المرور',
  'Current password': 'كلمة المرور الحالية',
  'New password': 'كلمة المرور الجديدة',
  'Confirm password': 'تأكيد كلمة المرور',
  'Update password': 'تحديث كلمة المرور',
  'Save changes': 'حفظ التغييرات',
  'Order history': 'سجل الطلبات',
  'Download history': 'سجل التنزيلات',
  'Product access': 'الوصول إلى المنتجات',
  'Manage subscription': 'إدارة الاشتراك',
  'No active subscriptions': 'لا توجد اشتراكات نشطة',
  'No purchased products yet': 'لا توجد منتجات مشتراة بعد',
  'No items in your wishlist yet': 'لا توجد عناصر في المفضلة بعد',
  'Browse products to get started.': 'تصفح المنتجات للبدء.',
  'View product': 'عرض المنتج',
  'Open app': 'فتح التطبيق',
  'Download file': 'تنزيل الملف',
  'Invoice number': 'رقم الفاتورة',
  'Issue date': 'تاريخ الإصدار',
  'Due date': 'تاريخ الاستحقاق',
  'Amount': 'المبلغ',
  'Method': 'الطريقة',
  'Provider': 'المزود',
  'Transaction': 'المعاملة',
  'Copy ID': 'نسخ المعرّف',
  'View receipt': 'عرض الإيصال',
  'Mark all as read': 'تحديد الكل كمقروء',
  'Read': 'مقروء',
  'Unread': 'غير مقروء',
  'No API keys yet': 'لا توجد مفاتيح API بعد',
  'Create API key': 'إنشاء مفتاح API',
  'Revoke': 'إلغاء',
  'Copy key': 'نسخ المفتاح',
  'Support request': 'طلب دعم',
  'Create ticket': 'إنشاء تذكرة',
  'Subject': 'الموضوع',
  'Message': 'الرسالة',
  'Send message': 'إرسال الرسالة',

  // Admin navigation and common operations
  'Entitlements': 'صلاحيات الوصول',
  'AI Engine': 'محرك الذكاء الاصطناعي',
  'Admin': 'الإدارة',
  'Overview': 'نظرة عامة',
  'Create product': 'إنشاء منتج',
  'Edit product': 'تعديل المنتج',
  'Add product': 'إضافة منتج',
  'Product name': 'اسم المنتج',
  'Description': 'الوصف',
  'Short description': 'وصف مختصر',
  'Slug': 'المعرّف النصي',
  'Thumbnail': 'الصورة المصغرة',
  'Published': 'منشور',
  'Draft': 'مسودة',
  'Archived': 'مؤرشف',
  'Approve': 'موافقة',
  'Reject': 'رفض',
  'Export': 'تصدير',
  'Import': 'استيراد',
  'Search customers...': 'ابحث عن العملاء...',
  'Search orders...': 'ابحث عن الطلبات...',
  'Search products...': 'ابحث عن المنتجات...',
  'Search payments...': 'ابحث عن المدفوعات...',
  'All statuses': 'كل الحالات',
  'All categories': 'كل الفئات',
  'All': 'الكل',
  'Today': 'اليوم',
  'This week': 'هذا الأسبوع',
  'This month': 'هذا الشهر',
  'Last 30 days': 'آخر 30 يومًا',
  'Created': 'تاريخ الإنشاء',
  'Updated': 'تاريخ التحديث',
  'Created at': 'تاريخ الإنشاء',
  'Updated at': 'تاريخ التحديث',
  'Email address': 'عنوان البريد الإلكتروني',
  'Role': 'الدور',
  'Admin user': 'مستخدم إداري',
  'Customer details': 'تفاصيل العميل',
  'Order details': 'تفاصيل الطلب',
  'Payment details': 'تفاصيل الدفع',
  'Refund details': 'تفاصيل الاسترداد',
  'Subscription details': 'تفاصيل الاشتراك',
  'Product details': 'تفاصيل المنتج',
  'Save product': 'حفظ المنتج',
  'Delete product': 'حذف المنتج',
  'Are you sure?': 'هل أنت متأكد؟',
  'This action cannot be undone.': 'لا يمكن التراجع عن هذا الإجراء.',
  'Success': 'نجاح',
  'Error': 'خطأ',
  'Warning': 'تحذير',

  // InvoiceFlow
  'Clients': 'العملاء',
  'Outstanding': 'المستحق',
  'InvoiceFlow is ready when you are': 'InvoiceFlow جاهز لك',
  'Purchase a lifetime InvoiceFlow plan once, then create clients and invoices directly from your SUMMECA account.': 'اشترِ خطة InvoiceFlow مدى الحياة مرة واحدة، ثم أنشئ العملاء والفواتير مباشرة من حساب SUMMECA.',
  'View InvoiceFlow plans': 'عرض خطط InvoiceFlow',
  'InvoiceFlow could not be loaded.': 'تعذر تحميل InvoiceFlow.',
  'SUMMECA SaaS': 'SUMMECA SaaS',
  'Create, track, share, print and export professional invoices from one workspace.': 'أنشئ الفواتير الاحترافية وتتبّعها وشاركها واطبعها وصدّرها من مساحة عمل واحدة.',
  'Export CSV': 'تصدير CSV',
  'New invoice': 'فاتورة جديدة',
  'Business profile': 'ملف النشاط التجاري',
  'This information appears on shared invoices.': 'تظهر هذه المعلومات في الفواتير المشتركة.',
  'Business name': 'اسم النشاط التجاري',
  'Legal name': 'الاسم القانوني',
  'Billing email': 'بريد الفوترة',
  'Phone': 'الهاتف',
  'Website': 'الموقع الإلكتروني',
  'Business address': 'عنوان النشاط التجاري',
  'Logo URL (optional)': 'رابط الشعار (اختياري)',
  'Invoice accent color': 'لون تمييز الفاتورة',
  'Invoice footer note': 'ملاحظة تذييل الفاتورة',
  'Save business profile': 'حفظ ملف النشاط التجاري',
  'Add client': 'إضافة عميل',
  'Client name': 'اسم العميل',
  'Company': 'الشركة',
  'Address': 'العنوان',
  'Save client': 'حفظ العميل',
  'No company': 'بدون شركة',
  'Add your first client to start invoicing.': 'أضف أول عميل لبدء إصدار الفواتير.',
  'Create invoice': 'إنشاء فاتورة',
  'Totals are calculated again on the server before the invoice is saved.': 'تُحسب الإجماليات مجددًا على الخادم قبل حفظ الفاتورة.',
  'Choose client': 'اختر العميل',
  'Tax %': 'الضريبة %',
  'Item description': 'وصف البند',
  'Qty': 'الكمية',
  'Rate': 'السعر',
  'Add line item': 'إضافة بند',
  'Notes': 'ملاحظات',
  'Terms': 'الشروط',
  'Draft total': 'إجمالي المسودة',
  'Due': 'الاستحقاق',
  'View/PDF': 'عرض/PDF',
  'Reminder': 'تذكير',
  'Sent': 'مُرسلة',
  'Mark paid': 'تحديد كمدفوعة',
  'No invoices yet. Create your first invoice above.': 'لا توجد فواتير بعد. أنشئ أول فاتورة أعلاه.',
  'Business profile saved.': 'تم حفظ ملف النشاط التجاري.',
  'Unable to save profile.': 'تعذر حفظ الملف.',
  'Client added.': 'تمت إضافة العميل.',
  'Unable to add client.': 'تعذر إضافة العميل.',
  'Invoice created.': 'تم إنشاء الفاتورة.',
  'Unable to create invoice.': 'تعذر إنشاء الفاتورة.',
  'Unable to update invoice.': 'تعذر تحديث الفاتورة.',
  'Secure invoice view opened. You can print or save it as PDF.': 'تم فتح عرض الفاتورة الآمن. يمكنك طباعتها أو حفظها بصيغة PDF.',
  'Unable to open invoice view.': 'تعذر فتح عرض الفاتورة.',
  'Add an email address to this client first.': 'أضف بريدًا إلكترونيًا لهذا العميل أولًا.',
  'There are no invoices to export.': 'لا توجد فواتير للتصدير.',

  // LeadFollow AI
  'Leads': 'العملاء المحتملون',
  'Due now': 'مستحق الآن',
  'Contacted': 'تم التواصل',
  'Replies': 'الردود',
  'Won': 'مكتسب',
  'Lost': 'مفقود',
  'New': 'جديد',
  'Replied': 'تم الرد',
  'Unlock LeadFollow AI': 'فعّل LeadFollow AI',
  'Purchase a lifetime plan, then manage your leads and create AI-assisted follow-up drafts from your SUMMECA account.': 'اشترِ خطة مدى الحياة، ثم أدر العملاء المحتملين وأنشئ مسودات متابعة بمساعدة الذكاء الاصطناعي من حساب SUMMECA.',
  'View LeadFollow AI plans': 'عرض خطط LeadFollow AI',
  'LeadFollow AI could not be loaded.': 'تعذر تحميل LeadFollow AI.',
  'Keep every lead organized and turn verified business context into ready-to-edit follow-up drafts.': 'نظّم كل عميل محتمل وحوّل سياق عملك الموثق إلى مسودات متابعة جاهزة للتعديل.',
  'Add lead': 'إضافة عميل محتمل',
  'Add a lead': 'إضافة عميل محتمل',
  'Only add information you actually know. AI drafts use these facts as context.': 'أضف فقط المعلومات التي تعرفها فعليًا. تستخدم مسودات الذكاء الاصطناعي هذه الحقائق كسياق.',
  'Lead name': 'اسم العميل المحتمل',
  'Source': 'المصدر',
  'Factual notes: need, objection, last conversation, requested information...': 'ملاحظات واقعية: الاحتياج، الاعتراض، آخر محادثة، المعلومات المطلوبة...',
  'Save lead': 'حفظ العميل المحتمل',
  'Your sales context': 'سياق المبيعات لديك',
  'Set this once so drafts stay grounded in your real offer. LeadFollow will not invent missing claims.': 'اضبط هذا مرة واحدة حتى تظل المسودات مبنية على عرضك الحقيقي. لن يختلق LeadFollow ادعاءات غير موجودة.',
  'What do you sell? Include factual scope and price only if you want it used.': 'ماذا تبيع؟ أدرج النطاق والسعر الواقعيين فقط إذا أردت استخدامهما.',
  'Target audience': 'الجمهور المستهدف',
  'Value proposition — factual, no invented results': 'عرض القيمة — حقائق فقط دون نتائج مختلقة',
  'Professional': 'احترافي',
  'Friendly': 'ودود',
  'Concise': 'موجز',
  'Consultative': 'استشاري',
  'Warm': 'دافئ',
  'Save sales context': 'حفظ سياق المبيعات',
  'AI follow-up studio': 'استوديو المتابعة بالذكاء الاصطناعي',
  'Generate a draft, review it, edit as needed, then send it yourself through your normal channel.': 'أنشئ مسودة وراجعها وعدّلها عند الحاجة، ثم أرسلها بنفسك عبر قناتك المعتادة.',
  'Choose a lead': 'اختر عميلًا محتملًا',
  'LinkedIn': 'LinkedIn',
  'WhatsApp': 'WhatsApp',
  'SMS': 'SMS',
  'Generic': 'عام',
  'First contact': 'التواصل الأول',
  'Follow-up': 'متابعة',
  'Objection response': 'الرد على اعتراض',
  'Close / next step': 'الإغلاق / الخطوة التالية',
  'Revive old lead': 'إعادة تنشيط عميل قديم',
  'English': 'الإنجليزية',
  'Arabic': 'العربية',
  'Spanish': 'الإسبانية',
  'French': 'الفرنسية',
  'German': 'الألمانية',
  'Additional factual context for this specific message (optional)': 'سياق واقعي إضافي لهذه الرسالة تحديدًا (اختياري)',
  'Generate draft': 'إنشاء مسودة',
  'Generating…': 'جارٍ الإنشاء…',
  'Draft history': 'سجل المسودات',
  'Copy draft': 'نسخ المسودة',
  'Choose a lead first.': 'اختر عميلًا محتملًا أولًا.',
  'AI generation failed.': 'فشل إنشاء المحتوى بالذكاء الاصطناعي.',
  'Draft generated and saved to history.': 'تم إنشاء المسودة وحفظها في السجل.',
  'Draft copied.': 'تم نسخ المسودة.',
  'Could not copy the draft.': 'تعذر نسخ المسودة.',
  'Business context saved.': 'تم حفظ سياق النشاط التجاري.',
  'Lead added.': 'تمت إضافة العميل المحتمل.',
  'Unable to add lead.': 'تعذر إضافة العميل المحتمل.',
  'Unable to update lead.': 'تعذر تحديث العميل المحتمل.',

  // Generic status/form vocabulary found throughout the app
  'draft': 'مسودة',
  'sent': 'مُرسلة',
  'paid': 'مدفوعة',
  'cancelled': 'ملغاة',
  'new': 'جديد',
  'contacted': 'تم التواصل',
  'replied': 'تم الرد',
  'won': 'مكتسب',
  'lost': 'مفقود',
  'professional': 'احترافي',
  'friendly': 'ودود',
  'concise': 'موجز',
  'consultative': 'استشاري',
  'warm': 'دافئ',
  'email': 'البريد الإلكتروني',
  'generic': 'عام',
  'first_contact': 'التواصل الأول',
  'follow_up': 'متابعة',
  'objection': 'اعتراض',
  'close': 'إغلاق',
  'revive': 'إعادة تنشيط',
};

const NORMALIZED_COMPREHENSIVE = new Map(
  Object.entries(COMPREHENSIVE_AR_TRANSLATIONS).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

function preserveWhitespace(value: string, translated: string) {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = value.match(/\s*$/)?.[0] ?? '';
  return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}

function coreValue(value: string) {
  const leading = value.match(/^\s*/)?.[0].length ?? 0;
  const trailing = value.match(/\s*$/)?.[0].length ?? 0;
  return value.slice(leading, Math.max(leading, value.length - trailing));
}

function looksTechnical(value: string) {
  const core = value.trim();
  if (!core) return true;
  if (/^https?:\/\//i.test(core)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(core)) return true;
  if (/^(?:[A-Fa-f0-9-]{24,}|0x[A-Fa-f0-9]+)$/.test(core)) return true;
  if (/^[\d\s.,:+\-/%$€£¥₽₿]+$/.test(core)) return true;
  return false;
}

function translateDynamic(core: string): string | null {
  let match = core.match(/^Order:\s*(.+)$/i);
  if (match) return `الطلب: ${match[1]}`;

  match = core.match(/^(.+) payment created$/i);
  if (match) return `تم إنشاء دفعة ${match[1]}`;

  match = core.match(/^Create (.+) Payment$/i);
  if (match) return `إنشاء دفعة ${match[1]}`;

  match = core.match(/^(.+) · Lifetime$/i);
  if (match) return `${translateComprehensiveCore(match[1])} · مدى الحياة`;

  match = core.match(/^AI drafts:\s*(.+) this month$/i);
  if (match) return `مسودات الذكاء الاصطناعي: ${match[1]} هذا الشهر`;

  match = core.match(/^(\d+)\s*\/\s*(.+) plan limit$/i);
  if (match) return `${match[1]} / ${match[2]} حد الخطة`;

  match = core.match(/^(\d+) currently overdue among loaded invoices · (.+) plan limit$/i);
  if (match) return `${match[1]} متأخرة حاليًا ضمن الفواتير المحمّلة · ${match[2]} حد الخطة`;

  match = core.match(/^Draft total:\s*(.+)$/i);
  if (match) return `إجمالي المسودة: ${match[1]}`;

  match = core.match(/^Invoice marked (.+)\.$/i);
  if (match) return `تم تحديث حالة الفاتورة إلى ${translateComprehensiveCore(match[1])}.`;

  match = core.match(/^Welcome,\s*(.+)!$/i);
  if (match) return `مرحبًا، ${match[1]}!`;

  match = core.match(/^Showing\s+(\d+)\s+of\s+(\d+)$/i);
  if (match) return `عرض ${match[1]} من ${match[2]}`;

  match = core.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
  if (match) return `الصفحة ${match[1]} من ${match[2]}`;

  return null;
}

function translateComprehensiveCore(core: string): string {
  const exact = COMPREHENSIVE_AR_TRANSLATIONS[core];
  if (exact) return exact;

  const normalized = NORMALIZED_COMPREHENSIVE.get(core.toLocaleLowerCase('en'));
  if (normalized) return normalized;

  const base = translateUiText(core);
  if (base !== core) return base;

  if (looksTechnical(core)) return core;

  return translateDynamic(core) ?? core;
}

export function translateComprehensiveText(value: string): string {
  if (!value || !/[A-Za-z]/.test(value)) return value;
  const core = coreValue(value);
  const translated = translateComprehensiveCore(core);
  return translated === core ? value : preserveWhitespace(value, translated);
}
