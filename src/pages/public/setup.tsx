import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useGetSetupStatus, useSetupOwner } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AuthShell from "@/components/auth/auth-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function Setup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { data: status, isLoading: statusLoading } = useGetSetupStatus();
  const setupMutation = useSetupOwner();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  useEffect(() => {
    if (!statusLoading && status?.ownerExists) {
      setLocation("~/admin");
    }
  }, [status, statusLoading, setLocation]);

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
      const response = await setupMutation.mutateAsync({ data: values });
      login(response.accessToken);
      toast({ title: "Owner account created" });
      setLocation("~/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      if (message.toLowerCase().includes("owner already exists")) {
        toast({ title: "Owner already exists", description: "Sign in at the admin portal." });
        setLocation("~/admin");
        return;
      }
      toast({ title: "Setup failed", description: message, variant: "destructive" });
    }
  };

  if (statusLoading || status?.ownerExists) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AuthShell role="admin" title="Create Owner Account" description="One-time setup for your LoyalQR shop">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="owner@example.com" {...field} />
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full mt-2" size="lg" disabled={setupMutation.isPending}>
            {setupMutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Already set up?{" "}
        <button type="button" className="text-primary font-medium hover:underline" onClick={() => setLocation("~/admin")}>
          Admin sign in
        </button>
      </p>
    </AuthShell>
  );
}
