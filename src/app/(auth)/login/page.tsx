"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard, AuthDivider, AuthFooterLink } from "@/components/auth/auth-card";
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

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "sanchay@cypherx.dev",
      password: "password123",
    },
  });

  function onSubmit(values: LoginValues) {
    console.info("Sign in", values);
  }

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
                  <Input placeholder="you@company.com" type="email" {...field} />
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
                  <Input placeholder="••••••••" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Sign in
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
