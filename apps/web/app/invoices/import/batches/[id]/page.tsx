import { InvoiceImportBatchDetailPage } from "@/src/components/invoice-import-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceImportBatchDetailPage id={id} />;
}
