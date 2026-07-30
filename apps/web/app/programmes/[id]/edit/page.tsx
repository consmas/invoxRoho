import { EditProgrammePage } from "@/src/components/workflow-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProgrammePage id={id} />;
}
