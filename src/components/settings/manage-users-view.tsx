"use client";

import React from "react";
import RolesManagementView from "./roles-management-view";
import StaffManagementView from "./staff-management-view";
import ActivityLogsView from "./activity-logs-view";

export interface ManageUsersViewProps {
  initialTab?: "roles" | "staff" | "activity-logs" | "logs" | string;
}

export default function ManageUsersView({ initialTab }: ManageUsersViewProps) {
  if (initialTab === "roles") {
    return <RolesManagementView />;
  }
  if (initialTab === "activity-logs" || initialTab === "logs") {
    return <ActivityLogsView />;
  }
  return <StaffManagementView />;
}
