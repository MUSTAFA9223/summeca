-- Remove only the known seeded demo reviews added by 20260904100000_product_reviews_v29.sql.
-- This intentionally does not delete any real customer review data.

DELETE FROM public.reviews
WHERE moderation_status = 'approved'
  AND (
    (reviewer_name = 'Alex M.' AND title = 'Incredible AI writing tool' AND body = 'SUMMECA AI Writer has completely transformed how I create content. The quality is outstanding and saves me hours every week.')
    OR (reviewer_name = 'Sarah K.' AND title = 'Great value for money' AND body = 'Really impressed with the output quality. The templates are well-designed and the AI suggestions are spot on.')
    OR (reviewer_name = 'David R.' AND title = 'Best dataset toolkit available' AND body = 'The preprocessing scripts alone are worth the price. Saved my team weeks of work on our ML pipeline.')
    OR (reviewer_name = 'Emma L.' AND title = 'Premium quality templates' AND body = 'These templates are exactly what I needed for my SaaS product. Clean, modern, and easy to customize.')
  );
