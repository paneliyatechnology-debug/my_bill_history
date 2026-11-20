"use client";

import React from "react";
import { useAuth } from "../../context/auth-context";

export interface PermissionGateProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Universal Centralized Permission Gate
 * Automatically renders children only when the current user has permission
 * for the given module and action. Otherwise returns fallback (default null).
 *
 * Example:
 * <PermissionGate module="parties" action="create">
 *   <button>+ Add New Party</button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action = "view",
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export const Can = PermissionGate;
export default PermissionGate;
