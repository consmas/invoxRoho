import {
  AppShell,
  DataTable,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/src/components/app-shell";

const rows = [
  ["REC-3101", "Payment", 97927.4, 97927.4, 0, "Matched"],
  ["REC-3102", "Collection", 100000, 99950, -50, "Investigating"],
  ["REC-3103", "Provider callback", 42200, 42200, 0, "Auto matched"],
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Reconciliation"
        description="Expected versus actual money movement, provider confirmations and investigation queues."
      />
      <DataTable
        headers={[
          "Reference",
          "Source",
          "Expected",
          "Actual",
          "Difference",
          "Status",
        ]}
      >
        {rows.map(([reference, source, expected, actual, difference, status]) => (
          <tr key={reference as string}>
            <td className="font-medium">{reference}</td>
            <td>{source}</td>
            <td>
              <MoneyDisplay amount={expected} />
            </td>
            <td>
              <MoneyDisplay amount={actual} />
            </td>
            <td>
              <MoneyDisplay
                amount={difference}
                tone={Number(difference) === 0 ? "positive" : "danger"}
              />
            </td>
            <td>
              <StatusBadge
                value={status as string}
                tone={Number(difference) === 0 ? "success" : "warning"}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
