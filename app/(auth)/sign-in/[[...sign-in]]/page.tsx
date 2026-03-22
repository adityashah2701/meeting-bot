import { SignIn } from "@clerk/nextjs";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Sign In", "Sign in to your Meeting Bot workspace.");

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "w-full border border-border bg-card shadow-none rounded-none",
          headerTitle: "text-2xl font-bold tracking-tight text-foreground",
          headerSubtitle: "text-sm text-muted-foreground",
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
          formFieldLabel: "text-sm font-medium text-foreground",
          formFieldInput: "border border-border bg-background focus:ring-2 focus:ring-primary/20 rounded-none",
          footerActionLink: "text-primary hover:underline",
          socialButtonsBlockButton: "border border-border bg-background text-foreground hover:bg-muted rounded-none",
        },
      }}
    />
  );
}
