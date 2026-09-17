import BaseSaasProductSalesExperience from './SaasProductSalesExperienceBase';
import SaasRealProductPreview from './SaasRealProductPreview';
import type {
  SaasSalesPlan,
  SaasSalesProduct,
} from './SaasProductSalesExperienceBase';

export * from './SaasProductSalesExperienceBase';

export default function SaasProductSalesExperience({
  product,
  plans,
}: {
  product: SaasSalesProduct;
  plans: SaasSalesPlan[];
}) {
  return (
    <>
      <BaseSaasProductSalesExperience product={product} plans={plans} />
      <SaasRealProductPreview product={product} />
    </>
  );
}
