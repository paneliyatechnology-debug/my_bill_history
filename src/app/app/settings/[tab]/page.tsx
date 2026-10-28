"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SettingsView } from "../../../../components/settings/settings-views";

export default function AppSettingsTabPage() {
  const params = useParams();
  const tab = (params?.tab as string) || "invoice";

  return <SettingsView tab={tab} />;
}
