"use client";

import React from "react";
import AppLayout from "./AppLayout";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
