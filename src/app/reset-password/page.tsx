import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Set a new password — CitizenAI" };

export default async function ResetPasswordPage() {
  // Reaching this page requires the recovery session created by /auth/confirm.
  // Landing here directly (or with an expired link) means no session.
  const user = await getUser();
  if (!user) redirect("/forgot-password?error=expired");

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your CitizenAI account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
