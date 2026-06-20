import { useEffect } from "react";
import { Redirect } from "wouter";

export default function Setup() {
  useEffect(() => {
    // Legacy single-tenant setup — redirect to SaaS signup
  }, []);

  return <Redirect to="~/shop?tab=signup" />;
}
