import { Redirect, useSearch } from "wouter";

/** Legacy /signup URLs → unified /shop auth with signup tab */
export default function SignupRedirect() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  params.set("tab", "signup");
  return <Redirect to={`~/shop?${params.toString()}`} />;
}
