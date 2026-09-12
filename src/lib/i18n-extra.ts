import { translateToArabic } from '@/lib/i18n';

const EXTRA_AR_TRANSLATIONS: Record<string, string> = {
  // Featured products
  'Featured Products': 'المنتجات المميزة',
  'Published offers from SUMMECA': 'عروض منشورة من SUMMECA',
  'Only active products with a real production plan are shown here.': 'نعرض هنا فقط المنتجات النشطة التي لديها خطة إنتاج حقيقية.',
  'View all products': 'عرض جميع المنتجات',
  'The first production product is being prepared.': 'يجري تجهيز أول منتج للإنتاج.',
  'No demo product or placeholder price is being advertised.': 'لا يتم عرض منتجات تجريبية أو أسعار مؤقتة.',
  'Product details available on the product page.': 'تفاصيل المنتج متاحة في صفحة المنتج.',
  '/mo': '/شهريًا',
  '/yr': '/سنويًا',
  'lifetime': 'مدى الحياة',

  // Pricing home section
  'Pricing comes from published product plans': 'الأسعار تأتي من خطط المنتجات المنشورة',
  'SUMMECA does not advertise placeholder Free, Pro, or Business tiers. The pricing page shows only active production offers using the same plan data used by checkout.': 'لا تعرض SUMMECA خططًا وهمية من نوع Free أو Pro أو Business. تعرض صفحة الأسعار فقط عروض الإنتاج النشطة باستخدام بيانات الخطط نفسها المستخدمة عند الدفع.',

  // Why SUMMECA / final CTA
  'Why SUMMECA': 'لماذا SUMMECA',
  'Technology for modern digital work': 'تقنية للعمل الرقمي الحديث',
  'Explore SUMMECA digital products, AI tools, and services from one platform.': 'استكشف منتجات SUMMECA الرقمية وأدوات الذكاء الاصطناعي والخدمات من منصة واحدة.',
  'Clear product and pricing information': 'معلومات واضحة عن المنتجات والأسعار',
  'Digital products and AI-powered tools': 'منتجات رقمية وأدوات مدعومة بالذكاء الاصطناعي',
  'Account-based access to purchases and downloads': 'الوصول إلى المشتريات والتنزيلات من خلال الحساب',
  'Support for SUMMECA customers': 'دعم لعملاء SUMMECA',
  'See all plans': 'عرض جميع الخطط',
  'Security-focused infrastructure with role-based access and audit controls.': 'بنية تحتية تركز على الأمان مع وصول قائم على الأدوار وضوابط للتدقيق.',
  'Fast Setup': 'إعداد سريع',
  'A streamlined setup experience for SUMMECA products and services.': 'تجربة إعداد مبسطة لمنتجات وخدمات SUMMECA.',
  'Digital Access': 'وصول رقمي',
  'Access SUMMECA digital products and services online wherever they are available.': 'الوصول إلى منتجات وخدمات SUMMECA الرقمية عبر الإنترنت حيثما كانت متاحة.',
  'Customer Support': 'دعم العملاء',
  'Get help with your SUMMECA account, products, and services.': 'احصل على المساعدة بشأن حساب SUMMECA والمنتجات والخدمات.',
  'Explore SUMMECA': 'استكشف SUMMECA',
  'Discover tools for your': 'اكتشف أدوات من أجل',
  'digital work': 'عملك الرقمي',
  'Browse SUMMECA products, digital resources, and AI-powered tools.': 'تصفح منتجات SUMMECA والموارد الرقمية والأدوات المدعومة بالذكاء الاصطناعي.',
  'Browse Products': 'تصفح المنتجات',
  'View Pricing': 'عرض الأسعار',

  // Homepage FAQ
  'Frequently asked questions': 'الأسئلة الشائعة',
  'Practical answers based on the production storefront.': 'إجابات عملية مبنية على المتجر الفعلي.',
  'What types of products does SUMMECA offer?': 'ما أنواع المنتجات التي تقدمها SUMMECA؟',
  'SUMMECA publishes AI tools, SaaS applications, templates, datasets, and other digital products. Only products with an active production offer appear in the public catalog.': 'تنشر SUMMECA أدوات ذكاء اصطناعي وتطبيقات SaaS وقوالب ومجموعات بيانات ومنتجات رقمية أخرى. ولا يظهر في الكتالوج العام إلا المنتجات التي لديها عرض إنتاج نشط.',
  'How does product access work after checkout?': 'كيف يتم الوصول إلى المنتج بعد الدفع؟',
  'Paid access is granted after the payment provider confirms the transaction server-side. Free offers are completed through the protected order flow. Downloads appear in your dashboard only when the purchased product includes a configured download entitlement.': 'يُمنح الوصول المدفوع بعد أن يؤكد مزود الدفع المعاملة من جهة الخادم. وتتم العروض المجانية عبر مسار الطلب المحمي. تظهر التنزيلات في لوحة التحكم فقط عندما يتضمن المنتج المشترى صلاحية تنزيل مهيأة.',
  'Which payment methods can I use?': 'ما طرق الدفع التي يمكنني استخدامها؟',
  'The checkout page shows the payment methods that are configured and available at that moment. SUMMECA does not advertise a payment processor as available when it is only in test mode or is not configured for production.': 'تعرض صفحة الدفع طرق الدفع المهيأة والمتاحة في تلك اللحظة. ولا تعلن SUMMECA عن مزود دفع على أنه متاح إذا كان في وضع الاختبار فقط أو غير مهيأ للإنتاج.',
  'How are SUMMECA AI features powered?': 'كيف تعمل ميزات الذكاء الاصطناعي في SUMMECA؟',
  'AI features use the providers configured for the specific SUMMECA service. Provider and model availability can change, so the site does not promise a specific third-party model unless that product explicitly states it.': 'تستخدم ميزات الذكاء الاصطناعي المزودين المهيئين لكل خدمة في SUMMECA. وقد يتغير توفر المزودين والنماذج، لذلك لا يَعِد الموقع بنموذج محدد من جهة خارجية إلا إذا ذكر المنتج ذلك صراحة.',

  // Support and public FAQ wording
  'Choose a help topic below or contact our support team directly.': 'اختر موضوع المساعدة أدناه أو تواصل مباشرة مع فريق الدعم.',
  'Find the right help faster': 'اعثر على المساعدة المناسبة بشكل أسرع',
  'Never send passwords, verification codes, private keys, or full payment credentials.': 'لا ترسل كلمات المرور أو رموز التحقق أو المفاتيح الخاصة أو بيانات الدفع الكاملة.',
  'Order Support': 'دعم الطلبات',
  'System Status': 'حالة النظام',

  // Refund policy vocabulary and explanatory text
  'Digital delivery': 'التسليم الرقمي',
  'Immediate access': 'وصول فوري',
  'Review window': 'فترة المراجعة',
  'Within 14 days': 'خلال 14 يومًا',
  'Contact us': 'تواصل معنا',
  'Duplicate charge': 'خصم مكرر',
  'Technical defect': 'خلل تقني',
  'Change of mind': 'تغيير الرأي',
  'Request a refund': 'طلب استرداد',
  'This policy does not limit mandatory consumer rights that apply under applicable law.': 'لا تحد هذه السياسة من حقوق المستهلك الإلزامية التي يقررها القانون المعمول به.',
  'By purchasing from SUMMECA, you acknowledge that digital delivery may begin immediately after successful payment confirmation.': 'بشرائك من SUMMECA، فإنك تقر بأن التسليم الرقمي قد يبدأ فور تأكيد الدفع بنجاح.',

  // Cookie policy vocabulary
  'Cookies': 'ملفات الارتباط',
  'Cookie settings': 'إعدادات ملفات الارتباط',
  'Authentication': 'المصادقة',
  'Preferences': 'التفضيلات',
  'Necessary': 'ضرورية',
  'Optional': 'اختيارية',
  'Browser settings': 'إعدادات المتصفح',

  // Store and dashboard common messages
  'My Account': 'حسابي',
  'My Products': 'منتجاتي',
  'My Orders': 'طلباتي',
  'My Downloads': 'تنزيلاتي',
  'Recent orders': 'الطلبات الأخيرة',
  'Recent activity': 'النشاط الأخير',
  'Account overview': 'نظرة عامة على الحساب',
  'Manage your account': 'إدارة حسابك',
  'Manage your products': 'إدارة منتجاتك',
  'Manage your orders': 'إدارة طلباتك',
  'Manage your subscriptions': 'إدارة اشتراكاتك',
  'Billing history': 'سجل الفوترة',
  'Payment history': 'سجل المدفوعات',
  'Order history': 'سجل الطلبات',
  'Download history': 'سجل التنزيلات',
  'Personal information': 'المعلومات الشخصية',
  'Change password': 'تغيير كلمة المرور',
  'Two-factor authentication': 'المصادقة الثنائية',
  'Save changes': 'حفظ التغييرات',
  'Changes saved': 'تم حفظ التغييرات',
  'Something went wrong. Please try again.': 'حدث خطأ ما. حاول مرة أخرى.',
  'No data available': 'لا توجد بيانات متاحة',
  'Loading dashboard…': 'جارٍ تحميل لوحة التحكم…',

  // Checkout/order status
  'Payment details': 'تفاصيل الدفع',
  'Order details': 'تفاصيل الطلب',
  'Customer details': 'تفاصيل العميل',
  'Purchase details': 'تفاصيل الشراء',
  'Continue to payment': 'المتابعة إلى الدفع',
  'Waiting for payment confirmation': 'بانتظار تأكيد الدفع',
  'Verify payment': 'التحقق من الدفع',
  'Payment failed': 'فشل الدفع',
  'Payment cancelled': 'تم إلغاء الدفع',
  'Purchase complete': 'اكتمل الشراء',
  'Access your product': 'الوصول إلى منتجك',
  'Return to products': 'العودة إلى المنتجات',
};

const NORMALIZED_EXTRA = new Map(
  Object.entries(EXTRA_AR_TRANSLATIONS).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

export function translateUiText(value: string): string {
  const baseTranslation = translateToArabic(value);
  if (baseTranslation !== value) return baseTranslation;
  if (!value || !/[A-Za-z]/.test(value)) return value;

  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = value.match(/\s*$/)?.[0] ?? '';
  const coreEnd = Math.max(leadingWhitespace.length, value.length - trailingWhitespace.length);
  const core = value.slice(leadingWhitespace.length, coreEnd);

  const translated = EXTRA_AR_TRANSLATIONS[core] ?? NORMALIZED_EXTRA.get(core.toLocaleLowerCase('en'));
  if (!translated) return value;

  return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}
