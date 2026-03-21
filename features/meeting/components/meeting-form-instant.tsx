"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MeetingFormInstant({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: { title: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ title });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Title
        </label>
        <Input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Quick Meeting - auto generated if left empty"
        />
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Starting..." : "Start Meeting"}
      </Button>
    </form>
  );
}
