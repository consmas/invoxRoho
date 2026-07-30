import { PaymentDetailPage } from "@/src/components/payment-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailPage id={id} />;
}
