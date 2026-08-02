import {
  AppShell,
  Card,
  DataTable,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/src/components/app-shell";

const journals = [
  ["JRN-24001", "Supplier disbursement", "DR Funding payable", 97927.4, "Posted"],
  ["JRN-24002", "Platform fee accrual", "CR Fee income", 100, "Posted"],
  ["JRN-24003", "Buyer collection", "DR Cash", 100000, "Pending review"],
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Ledger"
        description="Journal entries, posting status, control totals and trial-balance readiness."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Posted today
          </p>
          <p className="mt-3 text-2xl font-semibold">42</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pending review
          </p>
          <p className="mt-3 text-2xl font-semibold text-amber-700">3</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Control balance
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={0} tone="positive" />
          </p>
        </Card>
      </div>
      <DataTable headers={["Journal", "Source", "Entry", "Amount", "Status"]}>
        {journals.map(([journal, source, entry, amount, status]) => (
          <tr key={journal as string}>
            <td className="font-medium">{journal}</td>
            <td>{source}</td>
            <td>{entry}</td>
            <td>
              <MoneyDisplay amount={amount} />
            </td>
            <td>
              <StatusBadge
                value={status as string}
                tone={status === "Posted" ? "success" : "warning"}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
