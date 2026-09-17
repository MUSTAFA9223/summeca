import { createProductSocialCard } from './social-card';

export const alt = 'SUMMECA product preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return createProductSocialCard(slug);
}
