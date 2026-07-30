"use client";

import {
  BadgePercent,
  BarChart3,
  Building2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  FileUp,
  Gauge,
  Landmark,
  LayoutDashboard,
  Plug,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Webhook,
  Workflow,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/src/components/auth-provider";
import { PERMISSIONS } from "@/src/lib/permissions";
import type { PermissionKey } from "@/src/lib/permissions";

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.reportRead,
      },
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        permission: PERMISSIONS.reportRead,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Counterparties",
        href: "/counterparties",
        icon: Building2,
        permission: PERMISSIONS.counterpartyRead,
      },
      {
        label: "Programmes",
        href: "/programmes",
        icon: Workflow,
        permission: PERMISSIONS.programmeRead,
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: ReceiptText,
        permission: PERMISSIONS.invoiceRead,
      },
      {
        label: "Invoice Import",
        href: "/invoices/import",
        icon: FileUp,
        permission: PERMISSIONS.invoicesImport,
      },
      {
        label: "Invoice Exceptions",
        href: "/invoices/exceptions",
        icon: ShieldCheck,
        permission: PERMISSIONS.invoiceRead,
      },
      {
        label: "Financing",
        href: "/financing",
        icon: CircleDollarSign,
        permission: PERMISSIONS.financingRead,
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        permission: PERMISSIONS.paymentRead,
      },
    ],
  },
  {
    label: "Release 1",
    items: [
      {
        label: "Approved Payables",
        href: "/programmes",
        icon: BadgePercent,
        permission: PERMISSIONS.programmeRead,
      },
      {
        label: "Audit Ready",
        href: "/reports",
        icon: ShieldCheck,
        permission: PERMISSIONS.auditRead,
      },
      {
        label: "Operations Control",
        href: "/operations",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.reportRead,
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: ShieldCheck,
        permission: PERMISSIONS.workflowReadV2,
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        permission: PERMISSIONS.documentsRead,
      },
      {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: PERMISSIONS.notificationsRead,
      },
      {
        label: "Compliance",
        href: "/compliance",
        icon: ShieldCheck,
        permission: PERMISSIONS.complianceRead,
      },
      {
        label: "Connections",
        href: "/integrations/connections",
        icon: Plug,
        permission: PERMISSIONS.integrationsRead,
      },
      {
        label: "Integration Logs",
        href: "/integrations/logs",
        icon: Search,
        permission: PERMISSIONS.integrationsLogsRead,
      },
      {
        label: "Webhooks",
        href: "/webhooks/endpoints",
        icon: Webhook,
        permission: PERMISSIONS.webhooksRead,
      },
      {
        label: "Webhook Deliveries",
        href: "/webhooks/deliveries",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.webhooksRead,
      },
      {
        label: "Payment Webhooks",
        href: "/webhooks/payments",
        icon: Webhook,
        permission: PERMISSIONS.paymentsWebhookRead,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users & Roles",
        href: "/users",
        icon: Users,
        permission: PERMISSIONS.usersRead,
        roles: ["PLATFORM_ADMIN", "PLATFORM_ADMINISTRATOR"],
      },
      {
        label: "Roles",
        href: "/roles",
        icon: ShieldCheck,
        permission: PERMISSIONS.rolesManage,
        roles: ["PLATFORM_ADMIN", "PLATFORM_ADMINISTRATOR"],
      },
    ],
  },
] as const;

type NavItem = (typeof navGroups)[number]["items"][number];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, token, user, logout, can } = useAuth();

  useEffect(() => {
    if (ready && !token) {
      router.replace("/login");
    }
  }, [ready, token, router]);

  if (!ready || !token || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Card>Checking session...</Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">INVOX</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supply Chain Finance
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.filter((item) => canAccessNavItem(item, can, user.roles)).map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${group.label}-${item.label}`}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="flex-1">{item.label}</span>
                      {active ? <ChevronRight className="size-4" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-sidebar-border bg-background p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                IV
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.roles.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Landmark className="size-4" />
              </div>
              <span className="font-semibold">INVOX</span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
              <Search className="size-4" />
              <span>Search programmes, invoices, counterparties...</span>
              <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                /
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                API :3001
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Release 1
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
                aria-label="Logout"
              >
                <Settings2 className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}

function canAccessNavItem(
  item: NavItem,
  can: (permission: PermissionKey | string) => boolean,
  userRoles: string[],
) {
  return can(item.permission) || ("roles" in item && item.roles.some((role) => userRoles.includes(role)));
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gauge className="size-4" />
          <span>Workspace</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PermissionGate({
  permission,
  children,
}: {
  permission: PermissionKey | string;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : null;
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary:
      "border border-border bg-card text-card-foreground hover:bg-muted",
    danger: "bg-destructive text-white hover:bg-destructive/90",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${
        props.className ?? ""
      }`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      <Plus className="size-4" />
      {children}
    </Link>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20";

export function StatusMessage({
  loading,
  error,
  empty,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
}) {
  if (loading) {
    return <Card>Loading...</Card>;
  }
  if (error) {
    return <Card>{error}</Card>;
  }
  if (empty) {
    return <Card>{empty}</Card>;
  }
  return null;
}

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
