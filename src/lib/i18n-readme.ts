// SUMMECA bilingual UI policy:
// - English remains the source UI language.
// - Arabic mode is applied by LanguageProvider across public, auth, checkout,
//   customer dashboard, admin, and SUMMECA SaaS surfaces.
// - Brand names, URLs, email addresses, IDs, crypto addresses, code and other
//   technical values remain LTR and are intentionally not translated.
// - User-entered values are never machine-mutated; only visible UI text and
//   translatable presentation attributes are localized.
export const SUMMECA_I18N_SCOPE = 'en-ar-sitewide' as const;
