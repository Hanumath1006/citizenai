import { getProfile, getUser } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SignOutButton } from "@/components/app/SignOutButton";

export const metadata = { title: "Profile — CitizenAI" };

export default async function ProfilePage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  const initial =
    (profile?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-muted">
        Set defaults so the planner pre-fills them every time.
      </p>

      <Card className="mt-8 flex items-center gap-4 p-6">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-xl font-semibold text-brand">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">
            {profile?.full_name || "Traveller"}
          </p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </Card>

      <Card className="mt-6 p-6 sm:p-8">
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
