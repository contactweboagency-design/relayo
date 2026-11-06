import { AuthForm } from "../AuthForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="login" error={(await searchParams).error} />;
}
