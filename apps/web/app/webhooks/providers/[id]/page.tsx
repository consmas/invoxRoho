import { ProviderWebhookEventDetailPage } from "@/src/components/provider-webhook-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProviderWebhookEventDetailPage id={id} />;
}
