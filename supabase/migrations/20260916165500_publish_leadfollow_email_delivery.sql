begin;

update public.products
set
  short_desc = 'Track leads, generate grounded AI follow-ups, and send reviewed email drafts directly from SUMMECA.',
  description = 'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts for email, LinkedIn, WhatsApp, SMS, and general follow-up. Email drafts can be reviewed, edited, and sent directly from SUMMECA through the server-side email delivery flow. LinkedIn, WhatsApp, SMS, and generic drafts remain copy-and-send. LeadFollow AI sends only after explicit user confirmation and does not invent testimonials, guarantees, discounts, or business facts.',
  updated_at = now()
where slug = 'summeca-leadfollow-ai';

update public.product_plans pp
set features = array_append(coalesce(pp.features, array[]::text[]), 'Direct email sending after review')
from public.products p
where pp.product_id = p.id
  and p.slug = 'summeca-leadfollow-ai'
  and pp.is_active = true
  and not ('Direct email sending after review' = any(coalesce(pp.features, array[]::text[])));

commit;
