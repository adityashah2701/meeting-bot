import { redirect } from "next/navigation";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Create Meeting", "Create an instant room or schedule a meeting for later.");

export default function CreateMeetingRoute() {
  redirect("/meetings");
}
