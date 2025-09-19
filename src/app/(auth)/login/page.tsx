"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard, AuthDivider, AuthFooterLink } from "@/components/auth/auth-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(
    () => searchParams?.get("next") ?? "/dashboard",
    [searchParams],
  );

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "sanchay@cypherx.dev",
      password: "password123",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  async function onSubmit(values: LoginValues) {
    form.clearErrors("root");
    try {
      await login({ email: values.email, password: values.password });
      toast({ title: "Signed in", description: "Welcome back to CypherX." });
      router.replace(redirectTo);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in. Please try again.";
      form.setError("root", { message });
      toast({ variant: "destructive", title: "Sign in failed", description: message });
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your APIs and workspace."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Forgot password?</span>
          <AuthFooterLink href="/forgot-password" label="Reset it" />
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@company.com"
                    type="email"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {rootError ? (
            <p className="text-sm text-destructive">{rootError}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>
      <AuthDivider />
      <Button variant="outline" className="w-full" type="button">
        Continue with Google
      </Button>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account? <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Create one</Link>
      </p>
    </AuthCard>
  );
}
