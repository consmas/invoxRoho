"use client";

import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  BookOpenCheck,
  Building2,
  CheckSquare,
  ChevronRight,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  FileUp,
  Gauge,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plug,
  Plus,
  ReceiptText,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/components/auth-provider";
import { PERMISSIONS } from "@/src/lib/permissions";
import type { PermissionKey } from "@/src/lib/permissions";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: PermissionKey | string;
  roles?: readonly string[];
};

const navGroups: { label: string; eyebrow: string; items: NavItem[] }[] = [
  {
    label: "Operate",
    eyebrow: "Daily work",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.reportRead,
      },
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
        label: "Import Batches",
        href: "/invoices/import",
        icon: FileUp,
        permission: PERMISSIONS.invoicesImport,
      },
      {
        label: "Exceptions",
        href: "/invoices/exceptions",
        icon: AlertTriangle,
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
      {
        label: "Collections",
        href: "/collections",
        icon: Banknote,
        permission: PERMISSIONS.collectionRead,
      },
    ],
  },
  {
    label: "Control",
    eyebrow: "Risk and integrity",
    items: [
      {
        label: "Credit & Exposure",
        href: "/credit-exposure",
        icon: Scale,
        permission: PERMISSIONS.exposureRead,
      },
      {
        label: "Ledger",
        href: "/ledger",
        icon: BookOpenCheck,
        permission: PERMISSIONS.ledgerRead,
      },
      {
        label: "Reconciliation",
        href: "/reconciliation",
        icon: ListChecks,
        permission: PERMISSIONS.reconciliationRead,
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: ClipboardCheck,
        permission: PERMISSIONS.workflowReadV2,
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        permission: PERMISSIONS.documentsRead,
      },
      {
        label: "Compliance",
        href: "/compliance",
        icon: ShieldCheck,
        permission: PERMISSIONS.complianceRead,
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
    label: "Admin",
    eyebrow: "Configuration",
    items: [
      {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: PERMISSIONS.notificationsRead,
      },
      {
        label: "Integrations",
        href: "/integrations/connections",
        icon: Plug,
        permission: PERMISSIONS.integrationsRead,
      },
      {
        label: "Webhooks",
        href: "/webhooks/endpoints",
        icon: Webhook,
        permission: PERMISSIONS.webhooksRead,
      },
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
        icon: BadgeCheck,
        permission: PERMISSIONS.rolesManage,
        roles: ["PLATFORM_ADMIN", "PLATFORM_ADMINISTRATOR"],
      },
      {
        label: "Audit Trail",
        href: "/audit-trail",
        icon: Archive,
        permission: PERMISSIONS.auditRead,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings2,
        permission: PERMISSIONS.usersRead,
        roles: ["PLATFORM_ADMIN", "PLATFORM_ADMINISTRATOR"],
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, token, user, logout, can } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (ready && !token) {
      router.replace("/login");
    }
  }, [ready, token, router]);

  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            canAccessNavItem(item, can, user?.roles ?? []),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [can, user?.roles],
  );

  if (!ready || !token || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-sm text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </div>
          <p className="text-sm font-medium">Checking session...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifying access and permissions.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
          <SidebarContent
            groups={visibleGroups}
            pathname={pathname}
            userEmail={user.email}
            roles={user.roles}
            onLogout={logout}
            onNavigate={() => setMobileOpen(false)}
          />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-80 max-w-[86vw] border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
            <SidebarContent
              groups={visibleGroups}
              pathname={pathname}
              userEmail={user.email}
              roles={user.roles}
              onLogout={logout}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>

            <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground md:flex">
              <Search className="size-4" />
              <span>Search counterparties, invoices, programmes, payments...</span>
              <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 sm:inline-flex">
                Staging
              </span>
              <span className="hidden rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground xl:inline-flex">
                Acting as: {formatRole(user.roles[0])}
              </span>
              <Link
                href="/approvals/pending"
                className="relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
                aria-label="Pending approvals"
              >
                <CheckSquare className="size-4" />
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                  3
                </span>
              </Link>
              <Link
                href="/notifications"
                className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}

function SidebarContent({
  groups,
  pathname,
  userEmail,
  roles,
  onLogout,
  onNavigate,
}: {
  groups: { label: string; eyebrow: string; items: NavItem[] }[];
  pathname: string;
  userEmail: string;
  roles: string[];
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="mb-3 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
          Staging
        </div>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="size-5" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-none tracking-wide text-white">
              INVOX
            </p>
            <p className="mt-1 text-xs text-white/55">
              Supply Chain Finance OS
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>
              <p className="text-[10px] text-white/25">{group.eyebrow}</p>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.label}-${item.label}`}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/58 hover:bg-white/[0.06] hover:text-white/90"
                    }`}
                  >
                    {active ? (
                      <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-emerald-300" />
                    ) : null}
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active ? <ChevronRight className="size-3.5" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary">
              {initials(userEmail)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userEmail}</p>
              <p className="truncate text-xs text-white/45">
                {roles.map(formatRole).join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md p-2 text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function canAccessNavItem(
  item: NavItem,
  can: (permission: PermissionKey | string) => boolean,
  userRoles: string[],
) {
  return (
    can(item.permission) ||
    Boolean(item.roles?.some((role) => userRoles.includes(role)))
  );
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
    <div className="mb-6 border-b border-border pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Gauge className="size-3.5" />
            <span>Workspace</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
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

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm ${
        className ?? ""
      }`}
    >
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
      className={`inline-flex min-h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${
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
      className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
      <span className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

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
    return (
      <Card>
        <p className="text-sm font-medium">Loading...</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fetching the latest operating data.
        </p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-destructive">Request failed</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </Card>
    );
  }
  if (empty) {
    return (
      <Card>
        <p className="text-sm font-medium">{empty}</p>
      </Card>
    );
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
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-muted-foreground" />
          <span>Records</span>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Search className="size-3.5" />
          <span>Filter, sort and export-ready table</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-[13px]">
          <thead className="bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-nowrap px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-sm [&_tr:hover]:bg-muted/45">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {delta ? <p className="mt-2 text-xs text-muted-foreground">{delta}</p> : null}
    </Card>
  );
}

export function MoneyDisplay({
  amount,
  currency = "GHS",
  tone = "neutral",
}: {
  amount: number | string;
  currency?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  const formatted = Number.isFinite(numeric)
    ? numeric.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(amount);
  const tones = {
    neutral: "text-foreground",
    positive: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-destructive",
  };

  return (
    <span className={`tabular-nums ${tones[tone]}`}>
      {currency} {formatted}
    </span>
  );
}

export function StatusBadge({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      <Circle className="size-2 fill-current" />
      {titleCase(value)}
    </span>
  );
}

export function DetailHeader({
  eyebrow,
  title,
  identifier,
  status,
  statusTone = "neutral",
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  identifier?: string;
  status?: string;
  statusTone?: "neutral" | "success" | "warning" | "danger" | "info";
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {identifier ? (
              <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {identifier}
              </span>
            ) : null}
            {status ? <StatusBadge value={status} tone={statusTone} /> : null}
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function initials(email: string) {
  const [name] = email.split("@");
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRole(role?: string) {
  if (!role) return "User";
  return titleCase(role.replace(/_/g, " "));
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
