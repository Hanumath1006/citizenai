import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Reset your password — CitizenAI" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to set a new one."
    >
      {error === "expired" && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          That reset link has expired or was already used. Request a new one
          below.
        </p>
      )}
      <ForgotPasswordForm />
    </AuthShell>
  );
}
