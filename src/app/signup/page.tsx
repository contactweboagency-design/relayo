import { AuthForm } from "../AuthForm";

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="signup" error={(await searchParams).error} />;
}
