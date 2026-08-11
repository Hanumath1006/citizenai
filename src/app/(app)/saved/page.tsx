import { Bookmark } from "lucide-react";
import { getBookmarks } from "@/lib/bookmarks";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Saved Places — CitizenAI" };

export default async function SavedPage() {
  const rows = await getBookmarks("saved_places");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Saved Places</h1>
      <p className="mt-1 text-muted">
        Spots you bookmarked to work into a future plan.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            body="Tap the bookmark on any stop to keep it here for later."
            actionLabel="Plan an outing"
            actionHref="/plan"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <BookmarkCard key={r.id} row={r} kind="saved" />
          ))}
        </div>
      )}
    </div>
  );
}
