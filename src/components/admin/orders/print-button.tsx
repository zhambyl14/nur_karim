"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="ink" onClick={() => window.print()} leftIcon={<Printer className="size-4" />}>
      {label}
    </Button>
  );
}
