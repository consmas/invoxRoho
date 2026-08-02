import {
  AppShell,
  Card,
  DataTable,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/src/components/app-shell";

const exposures = [
  ["CIPA Holdings Group", "Anchor", 2500000, 1840000, "Within limit"],
  ["Demo Supplier Ltd", "Supplier", 600000, 522000, "Watch"],
  ["Syndicate SCF Fund", "Funder", 3000000, 2100000, "Within limit"],
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Credit & Exposure"
        description="Counterparty limits, utilization, concentration caps and breach monitoring."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Total limit
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={6100000} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Utilized
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={4462000} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Headroom
          </p>
          <p className="mt-3 text-2xl font-semibold">
            <MoneyDisplay amount={1638000} tone="positive" />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Breaches
          </p>
          <p className="mt-3 text-2xl font-semibold text-destructive">0</p>
        </Card>
      </div>
      <DataTable
        headers={["Counterparty", "Type", "Limit", "Exposure", "Status"]}
      >
        {exposures.map(([name, type, limit, exposure, status]) => (
          <tr key={name as string}>
            <td className="font-medium">{name}</td>
            <td>{type}</td>
            <td>
              <MoneyDisplay amount={limit} />
            </td>
            <td>
              <MoneyDisplay amount={exposure} />
            </td>
            <td>
              <StatusBadge
                value={status as string}
                tone={status === "Watch" ? "warning" : "success"}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
