import { AppShell, Card, PageHeader, StatusBadge } from "@/src/components/app-shell";

const items = [
  ["Compliance Officer", "Approved KYC review", "Counterparty CP-1024", "2 minutes ago"],
  ["Operations Analyst", "Submitted payment for approval", "Payment PAY-4421", "18 minutes ago"],
  ["System", "Matched provider callback", "Reconciliation REC-3103", "1 hour ago"],
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Audit Trail"
        description="Immutable activity history across entities, approvals, integrations and financial postings."
      />
      <Card>
        <div className="space-y-4">
          {items.map(([actor, action, entity, time]) => (
            <div
              key={`${actor}-${action}`}
              className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold">{action}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {actor} · {entity}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value="Recorded" tone="success" />
                <span className="text-xs text-muted-foreground">{time}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
