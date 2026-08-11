import { Heart } from "lucide-react";
import { getBookmarks } from "@/lib/bookmarks";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Favorites — CitizenAI" };

export default async function FavoritesPage() {
  const rows = await getBookmarks("favorites");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Favorites</h1>
      <p className="mt-1 text-muted">Places you loved across your outings.</p>

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            body="Tap the heart on any stop in an itinerary to keep it here."
            actionLabel="Plan an outing"
            actionHref="/plan"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <BookmarkCard key={r.id} row={r} kind="favorites" />
          ))}
        </div>
      )}
    </div>
  );
}
