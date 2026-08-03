import { Phase2RecordDetailPage } from "@/src/components/phase2-product-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Phase2RecordDetailPage resource="investor-report-snapshots" id={id} />;
}
