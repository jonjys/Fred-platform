"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateCompanyForm } from "@/components/analyzer/CreateCompanyForm";

/** Collapsed by default so the settings page reads as "edit your company",
 * not "here's an empty form" — expands into the same creation form the
 * analyze page uses when a user has zero companies. */
export function AddCompanySection() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add another company
      </Button>
    );
  }

  return <CreateCompanyForm />;
}
