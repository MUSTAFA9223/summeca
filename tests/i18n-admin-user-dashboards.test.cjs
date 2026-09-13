const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const translations = fs.readFileSync(path.join(root, 'src/lib/i18n-admin-dashboard.ts'), 'utf8');
const languageContext = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const rtlCss = fs.readFileSync(path.join(root, 'src/styles/i18n.css'), 'utf8');

test('admin dashboard has Arabic coverage for navigation, analytics, commerce and Telegram alerts', () => {
  for (const phrase of [
    "'Dashboard': 'لوحة التحكم'",
    "'Orders': 'الطلبات'",
    "'Customers': 'العملاء'",
    "'Traffic & conversion': 'الزيارات والتحويل'",
    "'Visitors Today': 'زوار اليوم'",
    "'Monthly Conversion': 'معدل التحويل الشهري'",
    "'Payment Events': 'أحداث الدفع'",
    "'Download Entitlements': 'صلاحيات التنزيل'",
    "'Telegram visitor alerts': 'تنبيهات زوار تيليجرام'",
    "'Connect Telegram': 'ربط تيليجرام'",
  ]) {
    assert.ok(translations.includes(phrase), `missing admin translation: ${phrase}`);
  }
});

test('user dashboard has Arabic coverage for account, orders, billing, security and support', () => {
  for (const phrase of [
    "'SUMMECA Dashboard': 'لوحة تحكم SUMMECA'",
    "'Active Products': 'المنتجات النشطة'",
    "'Your Orders': 'طلباتك'",
    "'Your Subscriptions': 'اشتراكاتك'",
    "'Your Downloads': 'تنزيلاتك'",
    "'Account Settings': 'إعدادات الحساب'",
    "'Change Password': 'تغيير كلمة المرور'",
    "'Account Security': 'أمان الحساب'",
    "'API Key Management': 'إدارة مفاتيح API'",
    "'Help & Support': 'المساعدة والدعم'",
  ]) {
    assert.ok(translations.includes(phrase), `missing user-dashboard translation: ${phrase}`);
  }
});

test('global language provider applies dashboard translations and RTL dashboard layout remains enabled', () => {
  assert.match(languageContext, /translateAdminDashboardText/);
  assert.match(languageContext, /const dashboard = translateAdminDashboardText\(surface\)/);
  assert.match(rtlCss, /html\[dir='rtl'\] \[data-dashboard-sidebar\]/);
  assert.match(rtlCss, /html\[dir='rtl'\] \[data-admin-sidebar\]/);
  assert.match(rtlCss, /margin-right: 15rem !important/);
  assert.match(rtlCss, /margin-right: 16rem !important/);
});
