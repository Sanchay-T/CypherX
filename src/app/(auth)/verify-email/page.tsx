import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Check your inbox"
      description="We sent a verification link to api@yourcompany.com. Click the link to activate your account."
      footer={
        <p>
          Didn&apos;t get the email?{" "}
          <Link
            href="/verify-email"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Resend
          </Link>
        </p>
      }
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Once verified, you&apos;ll be redirected to the onboarding checklist.</p>
        <p>
          Have questions?{" "}
          <Link
            href="/support"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
      <Button asChild className="w-full" variant="outline">
        <Link href="/dashboard">Skip for now</Link>
      </Button>
    </AuthCard>
  );
}
