import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useGetSetupStatus, useLogin } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AuthShell from "@/components/auth/auth-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, logout, isAuthenticated, user } = useAuth();
  const { data: status, isLoading: statusLoading } = useGetSetupStatus();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!statusLoading && status && !status.ownerExists) {
      setLocation("~/setup");
    }
  }, [status, statusLoading, setLocation]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role === "owner") {
      setLocation("~/dashboard");
      return;
    }
    logout();
    toast({
      title: "Worker account detected",
      description: "Please sign in at the employee portal.",
      variant: "destructive",
    });
    setLocation("~/employee");
  }, [isAuthenticated, user, setLocation, logout, toast]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      login(response.accessToken);
      toast({ title: "Welcome back" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid credentials";
      toast({ title: "Sign in failed", description: message, variant: "destructive" });
    }
  };

  if (statusLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AuthShell role="admin" title="Admin Sign In" description="Owner access to the LoyalQR dashboard">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <Button type="submit" className="w-full mt-2" size="lg" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
