const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const details = fs.readFileSync(path.join(root, 'src/lib/i18n-dashboard-details.ts'), 'utf8');
const context = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

test('detailed user dashboard flows have Arabic coverage', () => {
  for (const phrase of [
    "'Request Refund': 'طلب استرداد'",
    "'Trial access': 'وصول تجريبي'",
    "'Unable to prepare this download securely.': 'تعذر تجهيز هذا التنزيل بأمان.'",
    "'No unread notifications': 'لا توجد إشعارات غير مقروءة'",
    "'Generate My Referral Link': 'إنشاء رابط الإحالة الخاص بي'",
    "'Email verification': 'التحقق من البريد الإلكتروني'",
    "'Sign out everywhere': 'تسجيل الخروج من جميع الأجهزة'",
  ]) {
    assert.ok(details.includes(phrase), `missing detailed translation: ${phrase}`);
  }
});

test('language context runs the detailed dashboard translation stage', () => {
  assert.match(context, /translateDashboardDetailsText/);
  assert.match(context, /translateDashboardDetailsText\(dashboard\)/);
});
