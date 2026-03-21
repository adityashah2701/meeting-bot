import { UserProfile } from "@clerk/nextjs";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border border-border bg-card p-6">
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile and account preferences.
        </p>
      </div>
      <div className="border border-border bg-card p-2">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none w-full bg-transparent border-none rounded-none",
            },
          }}
        />
      </div>
    </div>
  );
}
