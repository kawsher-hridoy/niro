import type { ReactNode } from "react";
import { AppShellGate } from "@/components/app-shell/AppShellGate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShellGate variant="patient">{children}</AppShellGate>;
}
