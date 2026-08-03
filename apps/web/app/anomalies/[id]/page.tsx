import { ProductRecordDetailPage } from "@/src/components/product-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductRecordDetailPage resource="ai-anomaly-signals" id={id} />;
}
