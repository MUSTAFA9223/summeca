const DASHBOARD_DETAILS_AR: Record<string, string> = {
  // User orders / refunds
  'Refund pending': 'الاسترداد قيد الانتظار',
  'Under review': 'قيد المراجعة',
  'Refund approved': 'تمت الموافقة على الاسترداد',
  'Processing': 'جارٍ المعالجة',
  'Refund completed': 'اكتمل الاسترداد',
  'Refund rejected': 'تم رفض الاسترداد',
  'Refund failed': 'فشل الاسترداد',
  'Product Issue': 'مشكلة في المنتج',
  'Not Satisfied': 'غير راضٍ',
  'Duplicate Purchase': 'شراء مكرر',
  'Other': 'أخرى',
  'Request Refund': 'طلب استرداد',
  'Close refund request': 'إغلاق طلب الاسترداد',
  'Submitting a refund request does not guarantee approval or a specific processing timeframe. Eligibility and completion depend on the order, payment method, provider confirmation, and applicable policy.': 'تقديم طلب استرداد لا يضمن الموافقة أو مدة معالجة محددة. تعتمد الأهلية والإكمال على الطلب وطريقة الدفع وتأكيد المزود والسياسة المطبقة.',
  'Read the refund policy': 'اقرأ سياسة الاسترداد',
  'Reason for refund': 'سبب الاسترداد',
  'Additional details': 'تفاصيل إضافية',
  'Describe the issue in more detail...': 'اشرح المشكلة بمزيد من التفاصيل...',
  'Submitting...': 'جارٍ الإرسال...',
  'Submit Request': 'إرسال الطلب',
  'Refund request submitted. Its status will update after review.': 'تم إرسال طلب الاسترداد، وستتحدث حالته بعد المراجعة.',
  'Unable to submit the refund request. Please try again.': 'تعذر إرسال طلب الاسترداد. حاول مرة أخرى.',
  'Payment state is based on server-side provider verification, not checkout redirects.': 'تعتمد حالة الدفع على تحقق المزود من جهة الخادم، وليس على إعادة التوجيه من صفحة الدفع.',
  'all statuses': 'كل الحالات',
  'verified': 'موثّق',
  'awaiting verification': 'بانتظار التحقق',
  'Currencies': 'العملات',
  'recorded': 'مسجل',

  // User subscription access
  'Active access': 'وصول نشط',
  'Trial access': 'وصول تجريبي',
  'Paused': 'متوقف مؤقتًا',
  'Marked cancelled': 'محدد كملغى',
  'Payment issue': 'مشكلة في الدفع',
  'Monthly access plan': 'خطة وصول شهرية',
  'Yearly access plan': 'خطة وصول سنوية',
  'One-time purchase': 'شراء لمرة واحدة',
  'Lifetime access': 'وصول مدى الحياة',
  'Not recorded': 'غير مسجل',
  'Access details are recorded in your account.': 'تفاصيل الوصول مسجلة في حسابك.',
  'This access record has no scheduled end date.': 'لا يوجد تاريخ انتهاء مجدول لسجل الوصول هذا.',
  'This access record is expired.': 'سجل الوصول هذا منتهي.',
  'This record is marked cancelled. That status does not by itself confirm cancellation of any provider-side recurring agreement.': 'هذا السجل محدد كملغى. هذه الحالة وحدها لا تؤكد إلغاء أي اتفاق متكرر لدى مزود الدفع.',
  'This record has a payment issue. No new access is granted until a new payment is verified.': 'يوجد في هذا السجل مشكلة دفع. لن يُمنح وصول جديد حتى يتم التحقق من دفعة جديدة.',
  'This access record is paused.': 'سجل الوصول هذا متوقف مؤقتًا.',
  'Unknown Product': 'منتج غير معروف',
  'Started': 'بدأ في',
  'Access through': 'الوصول حتى',
  'No scheduled end': 'لا يوجد انتهاء مجدول',
  'Payment provider': 'مزود الدفع',
  'View plan options': 'عرض خيارات الخطة',
  'Billing support': 'دعم الفوترة',
  'Failed to load access records': 'فشل تحميل سجلات الوصول',

  // User downloads
  'Revoked': 'ملغى الوصول',
  'Size not recorded': 'الحجم غير مسجل',
  'Failed to load downloads': 'فشل تحميل التنزيلات',
  'Unable to prepare this download securely.': 'تعذر تجهيز هذا التنزيل بأمان.',
  'Unable to download this file.': 'تعذر تنزيل هذا الملف.',
  'Files are delivered through short-lived server-authorized links. Direct storage URLs are not exposed here.': 'يتم تسليم الملفات عبر روابط قصيرة العمر ومصرح بها من الخادم، ولا تُعرض روابط التخزين المباشرة هنا.',
  'Dismiss': 'إخفاء',
  'Files': 'الملفات',
  'owned records': 'سجلات مملوكة',
  'not expired': 'غير منتهية',
  'blocked': 'محظورة',
  'recorded access': 'وصول مسجل',
  'Search files or products...': 'ابحث في الملفات أو المنتجات...',
  'Try Again': 'حاول مرة أخرى',
  'No files match this filter': 'لا توجد ملفات تطابق هذا الفلتر',
  'No downloads yet': 'لا توجد تنزيلات بعد',
  'Try another search or status.': 'جرّب بحثًا أو حالة أخرى.',
  'Secure downloadable files from eligible purchases will appear here.': 'ستظهر هنا الملفات الآمنة القابلة للتنزيل من المشتريات المؤهلة.',

  // User products landing
  'Review products and services you purchased with this account.': 'راجع المنتجات والخدمات التي اشتريتها بهذا الحساب.',
  'View orders': 'عرض الطلبات',
  'Access digital files that are currently available to your account.': 'ادخل إلى الملفات الرقمية المتاحة حاليًا لحسابك.',
  'Open downloads': 'فتح التنزيلات',
  'View active plans and subscription status linked to your account.': 'اعرض الخطط النشطة وحالة الاشتراك المرتبطة بحسابك.',
  'Manage subscriptions': 'إدارة الاشتراكات',
  'Your account': 'حسابك',
  'Access purchases, downloadable files, and subscriptions connected to your signed-in SUMMECA account.': 'ادخل إلى مشترياتك وملفاتك القابلة للتنزيل واشتراكاتك المرتبطة بحساب SUMMECA المسجل.',
  'Only account-linked purchases and entitlements are shown in the destination pages. If you have just completed a payment, use the Orders page to check its current status.': 'تعرض الصفحات المخصصة فقط المشتريات والصلاحيات المرتبطة بالحساب. إذا أكملت دفعة للتو، استخدم صفحة الطلبات للتحقق من حالتها الحالية.',

  // User notifications
  'Recommendations': 'التوصيات',
  'Could not load notifications.': 'تعذر تحميل الإشعارات.',
  'Could not update notification.': 'تعذر تحديث الإشعار.',
  'Could not mark notifications as read.': 'تعذر تحديد الإشعارات كمقروءة.',
  'Could not mark notification as read.': 'تعذر تحديد الإشعار كمقروء.',
  'Could not delete notification.': 'تعذر حذف الإشعار.',
  'No unread notifications': 'لا توجد إشعارات غير مقروءة',
  'Mark all read': 'تحديد الكل كمقروء',
  'Retry': 'إعادة المحاولة',
  'No notifications': 'لا توجد إشعارات',
  'There are no notifications to show.': 'لا توجد إشعارات لعرضها.',
  'View details →': 'عرض التفاصيل ←',

  // User referrals
  'Registered': 'مسجل',
  'Purchased': 'أجرى شراءً',
  'Rewarded': 'تمت مكافأته',
  'Could not load referral statistics.': 'تعذر تحميل إحصاءات الإحالات.',
  'Could not create your referral link.': 'تعذر إنشاء رابط الإحالة الخاص بك.',
  'Your referral link is ready.': 'رابط الإحالة الخاص بك جاهز.',
  'Referral link copied.': 'تم نسخ رابط الإحالة.',
  'Could not copy the referral link.': 'تعذر نسخ رابط الإحالة.',
  "Earn 5% of a referred customer's first completed purchase. Refunded qualifying orders reverse the reward.": 'اربح 5% من أول عملية شراء مكتملة للعميل المُحال. تؤدي استردادات الطلبات المؤهلة إلى عكس المكافأة.',
  'Your Referral Link': 'رابط الإحالة الخاص بك',
  'Code:': 'الرمز:',
  'Generate your unique referral link to start tracking referrals.': 'أنشئ رابط إحالة فريدًا لبدء تتبع الإحالات.',
  'Generating…': 'جارٍ الإنشاء…',
  'Generate My Referral Link': 'إنشاء رابط الإحالة الخاص بي',
  'Tracked referrals': 'الإحالات المتتبعة',
  'Successful referrals': 'الإحالات الناجحة',
  'Recorded rewards': 'المكافآت المسجلة',
  'How it works': 'كيف يعمل',
  '1. Share your link': '1. شارك رابطك',
  'The referred user must register through your referral code.': 'يجب أن يسجل المستخدم المُحال من خلال رمز الإحالة الخاص بك.',
  '2. First purchase completes': '2. تكتمل أول عملية شراء',
  'The reward is created only when the qualifying order reaches verified completed status.': 'تُنشأ المكافأة فقط عندما يصل الطلب المؤهل إلى حالة مكتملة وموثقة.',
  '3. Reward is recorded': '3. تُسجل المكافأة',
  'SUMMECA records 5% in the same currency as that order; a refund reverses it.': 'تسجل SUMMECA نسبة 5% بالعملة نفسها لذلك الطلب؛ ويؤدي الاسترداد إلى عكسها.',
  'Recent Referrals': 'الإحالات الأخيرة',
  'No tracked referrals yet.': 'لا توجد إحالات متتبعة حتى الآن.',
  'Copy': 'نسخ',

  // User security
  'Unable to load security activity.': 'تعذر تحميل نشاط الأمان.',
  'Current password is required.': 'كلمة المرور الحالية مطلوبة.',
  'New password must be between 8 and 128 characters.': 'يجب أن تكون كلمة المرور الجديدة بين 8 و128 حرفًا.',
  'Passwords do not match.': 'كلمتا المرور غير متطابقتين.',
  'Unable to change your password.': 'تعذر تغيير كلمة المرور.',
  'Password changed successfully. The email service also confirmed delivery of the security notification.': 'تم تغيير كلمة المرور بنجاح، وأكدت خدمة البريد أيضًا تسليم إشعار الأمان.',
  'Password changed successfully.': 'تم تغيير كلمة المرور بنجاح.',
  'Unable to terminate sessions.': 'تعذر إنهاء الجلسات.',
  'Only security information that SUMMECA can verify is shown here.': 'تظهر هنا فقط معلومات الأمان التي تستطيع SUMMECA التحقق منها.',
  'Email verification': 'التحقق من البريد الإلكتروني',
  'Verified': 'موثّق',
  'Not verified': 'غير موثّق',
  'Session controls': 'عناصر التحكم بالجلسات',
  'Sign out everywhere is available below': 'خيار تسجيل الخروج من جميع الأجهزة متاح أدناه',
  'Verify your email address using the most recent confirmation email before relying on email-based account recovery.': 'تحقق من بريدك الإلكتروني باستخدام أحدث رسالة تأكيد قبل الاعتماد على استرداد الحساب عبر البريد.',
  'Security activity': 'نشاط الأمان',
  'Loading verified activity…': 'جارٍ تحميل النشاط الموثق…',
  'No server-recorded security events are available yet.': 'لا توجد أحداث أمان مسجلة على الخادم حتى الآن.',
  'Server-recorded event': 'حدث مسجل على الخادم',
  'Sign out everywhere': 'تسجيل الخروج من جميع الأجهزة',
  'Revokes active sessions through Supabase Auth. SUMMECA does not display an invented session count.': 'يلغي الجلسات النشطة عبر Supabase Auth. ولا تعرض SUMMECA عدد جلسات غير حقيقي.',
};

const NORMALIZED = new Map(
  Object.entries(DASHBOARD_DETAILS_AR).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
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

function translateNotificationType(value: string) {
  const types: Record<string, string> = {
    order: 'الطلبات',
    payment: 'المدفوعات',
    subscription: 'الاشتراكات',
    refund: 'الاستردادات',
    wishlist: 'المفضلة',
    recommendation: 'التوصيات',
    announcement: 'الإعلانات',
  };
  return types[value.toLocaleLowerCase('en')] ?? value;
}

function translateDynamic(core: string): string | null {
  let match = core.match(/^Order\s+(.+)$/i);
  if (match) return `الطلب ${match[1]}`;

  match = core.match(/^Refund request failed with status\s+(\d+)\.$/i);
  if (match) return `فشل طلب الاسترداد بالحالة ${match[1]}.`;

  match = core.match(/^Current access is recorded through\s+(.+)\. This date is not a promise of automatic renewal\.$/i);
  if (match) return `الوصول الحالي مسجل حتى ${match[1]}. هذا التاريخ لا يعني وعدًا بالتجديد التلقائي.`;

  match = core.match(/^Access expired on\s+(.+)\.$/i);
  if (match) return `انتهى الوصول في ${match[1]}.`;

  match = core.match(/^(\d+) unread notifications?$/i);
  if (match) return `${match[1]} إشعار غير مقروء`;

  match = core.match(/^No\s+(.+)\s+notifications yet$/i);
  if (match) return `لا توجد إشعارات ${translateNotificationType(match[1])} حتى الآن`;

  match = core.match(/^Referral\s+#(.+)$/i);
  if (match) return `إحالة #${match[1]}`;

  match = core.match(/^(.+)\s+\(currency unavailable\)$/i);
  if (match) return `${match[1]} (العملة غير متاحة)`;

  return null;
}

export function translateDashboardDetailsText(value: string): string {
  if (!value || !/[A-Za-z]/.test(value)) return value;
  const core = coreValue(value);
  const exact = DASHBOARD_DETAILS_AR[core];
  const normalized = NORMALIZED.get(core.toLocaleLowerCase('en'));
  const translated = exact ?? normalized ?? translateDynamic(core);
  return translated ? preserveWhitespace(value, translated) : value;
}
