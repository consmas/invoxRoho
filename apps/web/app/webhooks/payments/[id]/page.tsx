import { PaymentWebhookEventDetailPage } from "@/src/components/payment-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentWebhookEventDetailPage id={id} />;
}
