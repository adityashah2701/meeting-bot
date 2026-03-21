import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Account Settings
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your personal details, connected accounts, and security preferences.
        </p>
      </header>
      
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <UserProfile 
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full shadow-none",
              card: "shadow-none w-full bg-transparent border-none",
              navbar: "hidden md:flex border-r border-border pr-6",
              navbarButton: "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md",
              headerTitle: "text-xl font-bold tracking-tight text-foreground",
              headerSubtitle: "text-muted-foreground text-sm",
              profileSectionTitle: "text-foreground font-semibold border-b border-border pb-2 mb-4",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-medium",
              badge: "bg-primary/10 text-primary border border-primary/20",
              userPreviewTextContainer: "mt-0.5",
              socialButtonsBlockButton: "border border-border hover:bg-muted text-foreground font-medium",
              formFieldInput: "bg-secondary border-transparent focus:ring-2 focus:ring-primary/20",
              formFieldLabel: "text-foreground font-medium text-sm",
            }
          }}
        />
      </div>
    </div>
  );
}
