"use client";

import React from "react";
import { useParams } from "next/navigation";
import ItemsPage from "../page";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return <ItemsPage initialItemId={id} />;
}

