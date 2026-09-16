const LEADFOLLOW_EMAIL_AR: Record<string, string> = {
  'Track leads, generate grounded AI follow-ups, and send reviewed email drafts directly from SUMMECA.': 'تتبّع العملاء المحتملين وأنشئ متابعات مدعومة بالذكاء الاصطناعي وأرسل مسودات البريد التي راجعتها مباشرة من SUMMECA.',
  'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts for email, LinkedIn, WhatsApp, SMS, and general follow-up. Email drafts can be reviewed, edited, and sent directly from SUMMECA through the server-side email delivery flow. LinkedIn, WhatsApp, SMS, and generic drafts remain copy-and-send. LeadFollow AI sends only after explicit user confirmation and does not invent testimonials, guarantees, discounts, or business facts.': 'نظّم العملاء المحتملين وجدول المتابعات وأدر حالة مسار المبيعات وأنشئ مسودات تواصل واقعية بمساعدة الذكاء الاصطناعي للبريد الإلكتروني وLinkedIn وWhatsApp وSMS والمتابعات العامة. يمكن مراجعة مسودات البريد الإلكتروني وتعديلها وإرسالها مباشرة من SUMMECA عبر مسار إرسال آمن من جهة الخادم، بينما تبقى قنوات LinkedIn وWhatsApp وSMS والقناة العامة بنظام النسخ والإرسال. لا يرسل LeadFollow AI أي رسالة إلا بعد تأكيد المستخدم صراحة، ولا يختلق شهادات أو ضمانات أو خصومات أو معلومات تجارية.',
  'Direct email sending after review': 'إرسال البريد مباشرة بعد المراجعة',
  'Keep every lead organized, generate grounded follow-ups, and send reviewed email drafts directly from SUMMECA.': 'حافظ على تنظيم كل عميل محتمل، وأنشئ متابعات مبنية على السياق، وأرسل مسودات البريد التي راجعتها مباشرة من SUMMECA.',
  'Purchase a lifetime plan, then manage leads, create AI-assisted follow-ups, and send reviewed email drafts from your SUMMECA account.': 'اشترِ خطة مدى الحياة، ثم أدر العملاء المحتملين وأنشئ متابعات بمساعدة الذكاء الاصطناعي وأرسل مسودات البريد التي راجعتها من حساب SUMMECA.',
  'Generate and review the draft first. Email-channel drafts can then be sent directly from SUMMECA; other channels remain copy-and-send.': 'أنشئ المسودة وراجعها أولًا. بعد ذلك يمكن إرسال مسودات البريد الإلكتروني مباشرة من SUMMECA، بينما تبقى القنوات الأخرى بنظام النسخ والإرسال.',
  'Direct email delivery': 'إرسال البريد مباشرة',
  'Email subject': 'موضوع البريد',
  'I confirm I have permission or a lawful basis to email this lead. The message will be sent through SUMMECA and replies will go to my SUMMECA account email.': 'أؤكد أن لدي إذنًا أو أساسًا مشروعًا لإرسال بريد إلى هذا العميل المحتمل. ستُرسل الرسالة عبر SUMMECA وستصل الردود إلى بريد حسابي في SUMMECA.',
  'Sending...': 'جارٍ الإرسال...',
  'Email sent': 'تم إرسال البريد',
  'Send email': 'إرسال البريد',
  'Sent successfully at': 'تم الإرسال بنجاح في',
  'Email follow-up': 'متابعة عبر البريد',
  'Only an Email-channel draft can be sent by email.': 'يمكن إرسال المسودات التي أُنشئت لقناة البريد الإلكتروني فقط عبر البريد.',
  'This lead does not have an email address.': 'لا يوجد عنوان بريد إلكتروني لهذا العميل المحتمل.',
  'Add an email subject before sending.': 'أضف موضوع البريد قبل الإرسال.',
  'Email body cannot be empty.': 'لا يمكن أن يكون نص البريد فارغًا.',
  'Confirm that you have permission or a lawful basis to email this lead.': 'أكد أن لديك إذنًا أو أساسًا مشروعًا لإرسال بريد إلى هذا العميل المحتمل.',
  'Generate an email draft for the selected lead first.': 'أنشئ مسودة بريد للعميل المحتمل المحدد أولًا.',
  'Email could not be sent.': 'تعذر إرسال البريد.',
};

const NORMALIZED_LEADFOLLOW_EMAIL = new Map(
  Object.entries(LEADFOLLOW_EMAIL_AR).map(([english, arabic]) => [english.toLocaleLowerCase('en'), arabic]),
);

export function translateLeadFollowEmailText(value: string): string {
  if (!value || !/[A-Za-z]/.test(value)) return value;
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  const core = value.slice(leading.length, Math.max(leading.length, value.length - trailing.length));
  const translated = LEADFOLLOW_EMAIL_AR[core]
    ?? NORMALIZED_LEADFOLLOW_EMAIL.get(core.toLocaleLowerCase('en'));
  return translated ? `${leading}${translated}${trailing}` : value;
}
