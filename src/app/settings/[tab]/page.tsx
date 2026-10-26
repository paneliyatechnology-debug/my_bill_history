"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SettingsView } from "../../../components/settings/settings-views";

export default function SettingsTabPage() {
  const params = useParams();
  const tab = (params?.tab as string) || "account";

  return <SettingsView tab={tab} />;
}
