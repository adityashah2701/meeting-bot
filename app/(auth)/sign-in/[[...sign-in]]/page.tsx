import { SignIn } from "@clerk/nextjs";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata(
  "Sign In",
  "Sign in to your Meeting Bot workspace.",
);

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          // Card shell
          rootBox: "w-full",
          card: [
            "w-full shadow-none border border-border/60 bg-card/80 backdrop-blur-sm",
            "!rounded-2xl overflow-hidden",
          ].join(" "),

          // Header
          headerTitle:
            "text-xl font-bold tracking-tight text-foreground",
          headerSubtitle: "text-sm text-muted-foreground",
          logoBox: "hidden",

          // Social buttons
          socialButtonsBlockButton: [
            "border border-border/60 bg-background/60 text-foreground",
            "hover:bg-muted/60 transition-colors font-medium text-sm",
            "!rounded-xl",
          ].join(" "),
          socialButtonsBlockButtonText: "font-medium text-foreground",
          dividerLine: "bg-border/50",
          dividerText: "text-muted-foreground/60 text-xs",

          // Form fields
          formFieldLabel: "text-sm font-medium text-foreground/80",
          formFieldInput: [
            "border border-border/60 bg-background/60 text-foreground",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
            "placeholder:text-muted-foreground/40 text-sm",
            "!rounded-lg transition-colors",
          ].join(" "),
          formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",

          // Primary button
          formButtonPrimary: [
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 active:bg-primary/80",
            "font-semibold text-sm transition-all shadow-sm shadow-primary/20",
            "hover:-translate-y-0.5 !rounded-xl",
          ].join(" "),

          // Footer
          footerActionText: "text-sm text-muted-foreground",
          footerActionLink:
            "text-primary font-semibold hover:underline underline-offset-2",
          footer: "bg-muted/20 border-t border-border/40",

          // Alerts / errors
          formFieldErrorText: "text-destructive text-xs",
          alertText: "text-sm",
          alert: "!rounded-xl border-destructive/30 bg-destructive/10",

          // Identity preview
          identityPreviewText: "text-sm text-foreground",
          identityPreviewEditButton:
            "text-primary text-sm hover:underline",
        },
      }}
    />
  );
}
