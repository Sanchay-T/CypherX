import Link from "next/link";
import { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-2 text-center text-xs uppercase tracking-wide text-muted-foreground">
      <span className="relative inline-flex items-center bg-background px-3">Or continue with</span>
      <span className="absolute inset-x-0 top-1/2 -z-10 h-px translate-y-[-50%] bg-border" />
    </div>
  );
}

export function AuthFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
      {label}
    </Link>
  );
}
