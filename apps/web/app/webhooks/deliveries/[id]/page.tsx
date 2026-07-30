import { WebhookDeliveryDetailPage } from "@/src/components/integration-readiness-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebhookDeliveryDetailPage id={id} />;
}
