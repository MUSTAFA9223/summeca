begin;

update public.products
set thumbnail_url = 'https://summeca.com/assets/products/invoiceflow.webp'
where slug = 'summeca-invoiceflow';

update public.products
set thumbnail_url = 'https://summeca.com/assets/products/leadfollow-ai.webp'
where slug = 'summeca-leadfollow-ai';

commit;
