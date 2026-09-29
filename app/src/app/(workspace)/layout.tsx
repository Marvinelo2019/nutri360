import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth/session";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const context = await requireWorkspace();

  return (
    <AppShell
      clinicName={context.workspace.name}
      fullName={context.fullName}
      role={context.workspace.role}
    >
      {children}
    </AppShell>
  );
}
