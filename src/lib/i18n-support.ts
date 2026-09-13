const SUPPORT_AR_TRANSLATIONS: Record<string, string> = {
  'SUMMECA Support Center': 'مركز دعم SUMMECA',
  'How can we help?': 'كيف يمكننا مساعدتك؟',
  'Get quick help with your account, payments, purchases, downloads, and SUMMECA products.': 'احصل على مساعدة سريعة بخصوص حسابك والمدفوعات والمشتريات والتنزيلات ومنتجات SUMMECA.',
  'Choose a help topic below or contact our support team directly.': 'اختر موضوع المساعدة أدناه أو تواصل مباشرة مع فريق الدعم.',
  'Help topics': 'مواضيع المساعدة',
  'Find the right help faster': 'اعثر على المساعدة المناسبة بشكل أسرع',

  'Account & Sign In': 'الحساب وتسجيل الدخول',
  'Help with signing in, password recovery, profile access, and account settings.': 'مساعدة في تسجيل الدخول واستعادة كلمة المرور والوصول إلى الملف الشخصي وإعدادات الحساب.',
  'Manage account': 'إدارة الحساب',

  'Payments & Orders': 'المدفوعات والطلبات',
  'Understand checkout, payment status, receipts, failed payments, and order history.': 'تعرّف على الدفع وحالة المدفوعات والإيصالات والمدفوعات الفاشلة وسجل الطلبات.',
  'View orders': 'عرض الطلبات',

  'Downloads & Access': 'التنزيلات والوصول',
  'Find purchased files, product access, licenses, and download availability.': 'اعثر على الملفات المشتراة والوصول إلى المنتجات والتراخيص والتنزيلات المتاحة.',
  'Open downloads': 'فتح التنزيلات',

  'Products & Plans': 'المنتجات والخطط',
  'Get help choosing a product, understanding plans, subscriptions, and lifetime access.': 'احصل على مساعدة في اختيار المنتج وفهم الخطط والاشتراكات والوصول مدى الحياة.',
  'Browse products': 'تصفح المنتجات',

  'Security & Privacy': 'الأمان والخصوصية',
  'Learn how SUMMECA protects accounts, purchases, and personal information.': 'تعرّف على كيفية حماية SUMMECA للحسابات والمشتريات والمعلومات الشخصية.',
  'Privacy policy': 'سياسة الخصوصية',

  'Something Else': 'موضوع آخر',
  'Can’t find what you need? Contact the SUMMECA support team directly.': 'لم تجد ما تحتاجه؟ تواصل مباشرة مع فريق دعم SUMMECA.',
  "Can't find what you need? Contact the SUMMECA support team directly.": 'لم تجد ما تحتاجه؟ تواصل مباشرة مع فريق دعم SUMMECA.',
  'Contact support': 'تواصل مع الدعم',

  'Common questions': 'الأسئلة الشائعة',
  'Quick answers': 'إجابات سريعة',
  'Where can I find my purchased products?': 'أين أجد المنتجات التي اشتريتها؟',
  'After a successful purchase, your available products and files appear in your SUMMECA user dashboard under Downloads and Orders.': 'بعد اكتمال الشراء بنجاح، ستظهر المنتجات والملفات المتاحة لك في لوحة تحكم SUMMECA ضمن التنزيلات والطلبات.',
  'What should I do if a payment is pending?': 'ماذا أفعل إذا كانت عملية الدفع قيد الانتظار؟',
  'Keep the checkout confirmation and wait for the payment provider to finish processing. If the order remains pending, contact support and include your order details.': 'احتفظ بتأكيد الدفع وانتظر حتى ينتهي مزود الدفع من المعالجة. إذا بقي الطلب قيد الانتظار، فتواصل مع الدعم وأرفق تفاصيل طلبك.',
  'I forgot my password. How do I reset it?': 'نسيت كلمة المرور. كيف أعيد تعيينها؟',
  'Open the sign-in page, choose the forgot-password option, and follow the reset link sent to your email address.': 'افتح صفحة تسجيل الدخول، واختر خيار نسيت كلمة المرور، ثم اتبع رابط إعادة التعيين المرسل إلى بريدك الإلكتروني.',
  'Can I get help with a product before buying?': 'هل يمكنني الحصول على مساعدة بشأن منتج قبل الشراء؟',
  'Yes. For product selection, plan, and pricing questions before purchase, email sales@summeca.com.': 'نعم. لأسئلة اختيار المنتج والخطة والأسعار قبل الشراء، تواصل عبر sales@summeca.com.',
  'What information should I include in a support request?': 'ما المعلومات التي يجب أن أدرجها في طلب الدعم؟',
  'Include your SUMMECA account email, order number when relevant, the product name, and a short description of the issue. Never send passwords or private security codes.': 'أدرج بريد حساب SUMMECA ورقم الطلب عند الحاجة واسم المنتج ووصفًا مختصرًا للمشكلة. لا ترسل كلمات المرور أو رموز الأمان الخاصة.',

  'Still need help?': 'ما زلت بحاجة إلى مساعدة؟',
  'Send us a support request and include your account email, product name, and order number when applicable.': 'أرسل لنا طلب دعم وأرفق بريد حسابك واسم المنتج ورقم الطلب عند الحاجة.',
  'Email Support': 'مراسلة الدعم',
  'Never send passwords, verification codes, or private keys.': 'لا ترسل كلمات المرور أو رموز التحقق أو المفاتيح الخاصة.',
  'Customer support:': 'دعم العملاء:',
  'Order & delivery help:': 'مساعدة الطلبات والتسليم:',
  'Billing & payment help:': 'مساعدة الفوترة والدفع:',
};

const NORMALIZED_SUPPORT = new Map(
  Object.entries(SUPPORT_AR_TRANSLATIONS).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

export function translateSupportText(value: string): string {
  if (!value || !/[A-Za-z]/.test(value)) return value;

  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  const core = value.slice(leading.length, Math.max(leading.length, value.length - trailing.length));
  const translated = SUPPORT_AR_TRANSLATIONS[core] ?? NORMALIZED_SUPPORT.get(core.toLocaleLowerCase('en'));

  return translated ? `${leading}${translated}${trailing}` : value;
}
