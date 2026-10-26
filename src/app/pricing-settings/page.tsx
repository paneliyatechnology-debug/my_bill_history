"use client";

import React from "react";
import { SettingsView } from "../../components/settings/settings-views";

export default function PricingSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SettingsView tab="pricing" />
    </div>
  );
}
