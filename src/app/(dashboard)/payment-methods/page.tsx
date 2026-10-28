import { PaymentMethodsContainer } from "@/components/containers/payment-methods/payment-methods-container";
import { getPaymentMethodsPage } from "@/lib/queries/payment-method";
import { toSearchParams } from "@/lib/utils/search-params";

export default async function PaymentMethodsPage({ searchParams }: PageProps<"/payment-methods">) {
  const data = await getPaymentMethodsPage(toSearchParams(await searchParams));

  return <PaymentMethodsContainer data={data} />;
}
