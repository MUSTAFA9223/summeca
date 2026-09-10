-- Publish three self-serve SUMMECA digital products backed by protected server-generated ZIP bundles.
-- Idempotent: products are keyed by slug; the single intended plan is keyed by product + plan name.

INSERT INTO public.products (
  name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata, updated_at
)
VALUES
(
  'Ecommerce Product Page Conversion Kit',
  'ecommerce-product-page-conversion-kit',
  'A reusable ecommerce product-page copy toolkit with 100 AI prompts, 50 product-title formulas, 80 benefit-bullet templates, 60 CTA options, SEO and alt-text frameworks, a QA checklist, before-and-after examples, and an editable product-page planner. Delivered as a protected ZIP after verified payment. No conversion, ranking, revenue, or sales outcome is guaranteed.',
  '100 AI prompts plus title, benefit, CTA, SEO, QA, example, and planning resources for clearer ecommerce product pages.',
  'template',
  'active',
  'https://summeca.com/assets/products/ecommerce-product-page-conversion-kit.svg',
  '',
  ARRAY['ecommerce','product pages','copywriting','ai prompts','seo','templates'],
  jsonb_build_object(
    'version', 1,
    'digital_product', true,
    'download_url', 'generated:ecommerce-product-page-conversion-kit',
    'download_file_name', 'SUMMECA-Ecommerce-Product-Page-Conversion-Kit.zip',
    'download', jsonb_build_object(
      'path', 'generated:ecommerce-product-page-conversion-kit',
      'name', 'SUMMECA-Ecommerce-Product-Page-Conversion-Kit.zip',
      'size', 0
    )
  ),
  now()
),
(
  'AI Social Media Content Kit',
  'ai-social-media-content-kit',
  'A reusable social-content workflow with 300 AI prompts, 120 hooks, 80 CTA goals, platform frameworks, a 30-day editable content planner, and a brand-voice worksheet. Delivered as a protected ZIP after verified payment. No reach, follower, engagement, virality, revenue, or sales outcome is guaranteed.',
  '300 AI prompts, 120 hooks, 80 CTA goals, platform frameworks, brand-voice worksheet, and a 30-day content planner.',
  'template',
  'active',
  'https://summeca.com/assets/products/ai-social-media-content-kit.svg',
  '',
  ARRAY['social media','content planning','ai prompts','hooks','cta','templates'],
  jsonb_build_object(
    'version', 1,
    'digital_product', true,
    'download_url', 'generated:ai-social-media-content-kit',
    'download_file_name', 'SUMMECA-AI-Social-Media-Content-Kit.zip',
    'download', jsonb_build_object(
      'path', 'generated:ai-social-media-content-kit',
      'name', 'SUMMECA-AI-Social-Media-Content-Kit.zip',
      'size', 0
    )
  ),
  now()
),
(
  'Freelancer Client Management Kit',
  'freelancer-client-management-kit',
  'A reusable freelancer client-workflow kit with intake, project brief, proposal, scope-of-work, revision-policy and client-email templates, 100 AI client-management prompts, a client project tracker, invoice template, and delivery checklist. Delivered as a protected ZIP after verified payment. The materials are operational templates, not legal, tax, accounting, or financial advice.',
  'Reusable client intake, proposal, scope, revision, email, tracking, invoice, delivery, and AI workflow templates for freelancers.',
  'template',
  'active',
  'https://summeca.com/assets/products/freelancer-client-management-kit.svg',
  '',
  ARRAY['freelancer','client management','proposal','invoice','project tracker','templates'],
  jsonb_build_object(
    'version', 1,
    'digital_product', true,
    'download_url', 'generated:freelancer-client-management-kit',
    'download_file_name', 'SUMMECA-Freelancer-Client-Management-Kit.zip',
    'download', jsonb_build_object(
      'path', 'generated:freelancer-client-management-kit',
      'name', 'SUMMECA-Freelancer-Client-Management-Kit.zip',
      'size', 0
    )
  ),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_desc = EXCLUDED.short_desc,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  thumbnail_url = EXCLUDED.thumbnail_url,
  demo_url = EXCLUDED.demo_url,
  tags = EXCLUDED.tags,
  metadata = EXCLUDED.metadata,
  updated_at = now();

DO $$
DECLARE
  v_product_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE slug = 'ecommerce-product-page-conversion-kit';
  UPDATE public.product_plans
     SET description = 'One-time purchase. Protected digital ZIP access after verified payment.',
         price = 29.00,
         currency = 'USD',
         billing_period = 'one_time',
         features = ARRAY[
           '100 ecommerce product-description AI prompts',
           '50 product-title formulas',
           '80 benefit-bullet templates and 60 CTA options',
           'SEO and alt-text frameworks plus QA checklist',
           'Before-and-after examples and editable product-page planner',
           'Commercial-use license for your own business and client-service work'
         ],
         is_active = true,
         sort_order = 1,
         sale_price = NULL,
         sale_discount_type = NULL,
         sale_discount_value = NULL,
         sale_starts_at = NULL,
         sale_ends_at = NULL,
         updated_at = now()
   WHERE product_id = v_product_id AND name = 'Complete Kit';
  IF NOT FOUND THEN
    INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
    VALUES (v_product_id, 'Complete Kit', 'One-time purchase. Protected digital ZIP access after verified payment.', 29.00, 'USD', 'one_time', ARRAY[
      '100 ecommerce product-description AI prompts',
      '50 product-title formulas',
      '80 benefit-bullet templates and 60 CTA options',
      'SEO and alt-text frameworks plus QA checklist',
      'Before-and-after examples and editable product-page planner',
      'Commercial-use license for your own business and client-service work'
    ], true, 1);
  END IF;

  SELECT id INTO v_product_id FROM public.products WHERE slug = 'ai-social-media-content-kit';
  UPDATE public.product_plans
     SET description = 'One-time purchase. Protected digital ZIP access after verified payment.',
         price = 39.00,
         currency = 'USD',
         billing_period = 'one_time',
         features = ARRAY[
           '300 reusable social-media AI prompts',
           '120 hook ideas and 80 CTA goals',
           'Instagram, X, LinkedIn, Facebook, and short-video frameworks',
           '30-day editable content planner',
           'Brand-voice worksheet',
           'Commercial-use license for your own business and client-service work'
         ],
         is_active = true,
         sort_order = 1,
         sale_price = NULL,
         sale_discount_type = NULL,
         sale_discount_value = NULL,
         sale_starts_at = NULL,
         sale_ends_at = NULL,
         updated_at = now()
   WHERE product_id = v_product_id AND name = 'Complete Kit';
  IF NOT FOUND THEN
    INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
    VALUES (v_product_id, 'Complete Kit', 'One-time purchase. Protected digital ZIP access after verified payment.', 39.00, 'USD', 'one_time', ARRAY[
      '300 reusable social-media AI prompts',
      '120 hook ideas and 80 CTA goals',
      'Instagram, X, LinkedIn, Facebook, and short-video frameworks',
      '30-day editable content planner',
      'Brand-voice worksheet',
      'Commercial-use license for your own business and client-service work'
    ], true, 1);
  END IF;

  SELECT id INTO v_product_id FROM public.products WHERE slug = 'freelancer-client-management-kit';
  UPDATE public.product_plans
     SET description = 'One-time purchase. Protected digital ZIP access after verified payment.',
         price = 49.00,
         currency = 'USD',
         billing_period = 'one_time',
         features = ARRAY[
           'Client intake, project brief, proposal, and scope-of-work templates',
           'Revision-policy and client-email templates',
           '100 AI client-management prompts',
           'Editable client project tracker',
           'Invoice template and delivery checklist',
           'Commercial-use license for your own business and client-service work'
         ],
         is_active = true,
         sort_order = 1,
         sale_price = NULL,
         sale_discount_type = NULL,
         sale_discount_value = NULL,
         sale_starts_at = NULL,
         sale_ends_at = NULL,
         updated_at = now()
   WHERE product_id = v_product_id AND name = 'Complete Kit';
  IF NOT FOUND THEN
    INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
    VALUES (v_product_id, 'Complete Kit', 'One-time purchase. Protected digital ZIP access after verified payment.', 49.00, 'USD', 'one_time', ARRAY[
      'Client intake, project brief, proposal, and scope-of-work templates',
      'Revision-policy and client-email templates',
      '100 AI client-management prompts',
      'Editable client project tracker',
      'Invoice template and delivery checklist',
      'Commercial-use license for your own business and client-service work'
    ], true, 1);
  END IF;
END $$;
