import Link from "next/link";
import { AppShell, Card, PageHeader, StatusBadge } from "@/src/components/app-shell";

const settings = [
  {
    title: "Security policy",
    description: "MFA enforcement, password age, session lifetime, idle timeout and privileged access controls.",
    status: "Configured",
    href: "/users",
  },
  {
    title: "Roles and permissions",
    description: "Release 1 RBAC for platform users, counterparties, funders, auditors and integration actors.",
    status: "Active",
    href: "/roles",
  },
  {
    title: "Rates and FX",
    description: "Reference rates, FX rates, spreads, fees, day-count and effective-dated pricing controls.",
    status: "Ready",
    href: "/rates",
  },
  {
    title: "Notification delivery",
    description: "Provider selection, sender identity, retry policy, event templates and delivery monitoring.",
    status: "Sandbox",
    href: "/notification-settings",
  },
  {
    title: "API and service accounts",
    description: "Developer reference, service account controls, webhook signing secrets and integration hygiene.",
    status: "Ready",
    href: "/api-docs",
  },
  {
    title: "Scheduled reporting",
    description: "Recurring report packs for treasury, risk, investors, auditors and regulators.",
    status: "Draft",
    href: "/scheduled-reports",
  },
  {
    title: "Audit retention",
    description: "Immutable audit visibility across approvals, payments, integrations, products and admin actions.",
    status: "Active",
    href: "/audit-trail",
  },
  {
    title: "Tenant branding",
    description: "White-label presentation for anchor or partner programmes across the operating console.",
    status: "Planned",
    href: "/programmes",
  },
];

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Platform configuration, tenant branding, security policy and operating environment controls."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Environment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Staging mode is visible in the shell to prevent operational mistakes.
              </p>
            </div>
            <StatusBadge value="Staging" tone="warning" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Role-based access</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Navigation and actions are rendered from backend permissions.
              </p>
            </div>
            <StatusBadge value="Active" tone="success" />
          </div>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settings.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{item.title}</p>
              <StatusBadge
                value={item.status}
                tone={
                  item.status === "Active" || item.status === "Configured"
                    ? "success"
                    : item.status === "Planned"
                      ? "neutral"
                      : "warning"
                }
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
