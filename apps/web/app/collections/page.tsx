import {
  AppShell,
  Card,
  DataTable,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/src/components/app-shell";

const rows = [
  ["COL-1007", "CIPA Holdings Group", 128500, "Due today", "Scheduled"],
  ["COL-1008", "North Ridge Foods", 84750, "Overdue 2 days", "Exception"],
  ["COL-1009", "Tema Manufacturing", 201300, "Due Aug 6", "Pending"],
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Collections"
        description="Buyer settlement obligations, collection queues and exception follow-up."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Due this week
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={414550} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Overdue
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={84750} tone="danger" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Reconciled today
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={192000} tone="positive" />
          </p>
        </Card>
      </div>
      <DataTable
        headers={["Collection", "Buyer", "Expected", "Timing", "Status"]}
      >
        {rows.map(([id, buyer, amount, timing, status]) => (
          <tr key={id as string}>
            <td className="font-medium">{id}</td>
            <td>{buyer}</td>
            <td>
              <MoneyDisplay amount={amount} />
            </td>
            <td>{timing}</td>
            <td>
              <StatusBadge
                value={status as string}
                tone={status === "Exception" ? "danger" : "warning"}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
