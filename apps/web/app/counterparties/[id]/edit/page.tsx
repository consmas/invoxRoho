import { EditCounterpartyPage } from "@/src/components/workflow-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditCounterpartyPage id={id} />;
}
