import React from "react";
import { TableSkeleton } from "../../components/ui/skeleton";

export default function MastersLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-border shadow-subtle flex justify-between items-center animate-pulse">
        <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        <div className="h-10 w-36 bg-slate-200 rounded-xl" />
      </div>
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
