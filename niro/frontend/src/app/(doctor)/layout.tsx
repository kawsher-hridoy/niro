import type { ReactNode } from "react";
import { AppShellGate } from "@/components/app-shell/AppShellGate";

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <AppShellGate variant="doctor">{children}</AppShellGate>;
}
