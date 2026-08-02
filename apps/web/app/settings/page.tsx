import { AppShell, Card, PageHeader, StatusBadge } from "@/src/components/app-shell";

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Platform configuration, tenant branding, security policy and operating environment controls."
      />
      <div className="grid gap-4 md:grid-cols-2">
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
    </AppShell>
  );
}
