"use client";

import { useState } from "react";
import { searchWikipedia, type WikiSearchResult } from "@/lib/wikipedia";
import { saveEvent } from "@/actions/events";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function EventSearch({ isAdmin = false }: { isAdmin?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<WikiSearchResult | null>(null);
  const [date, setDate] = useState("");
  const [pinToPublic, setPinToPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchWikipedia(query);
      setResults(res);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selected || !date) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("name", selected.title);
    fd.set("date", date);
    fd.set("description", selected.snippet.replace(/<[^>]+>/g, "")); // strip HTML
    fd.set(
      "wikipediaUrl",
      `https://en.wikipedia.org/wiki/${encodeURIComponent(selected.title)}`
    );
    if (pinToPublic && isAdmin) fd.set("pinToPublic", "1");
    try {
      await saveEvent(fd);
      setSelected(null);
      setDate("");
      setPinToPublic(false);
      setResults([]);
      setQuery("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 min-w-72">
      <p className="text-sm font-medium">Add World Event to Charts</p>
      <div className="flex gap-2">
        <Input
          placeholder="Search Wikipedia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading} size="sm">
          {loading ? "…" : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="border rounded-md divide-y max-h-60 overflow-y-auto text-sm">
          {results.map((r) => (
            <li key={r.pageid}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                onClick={() => setSelected(r)}
              >
                <span className="font-medium">{r.title}</span>
                <p
                  className="text-muted-foreground text-xs line-clamp-1 mt-0.5"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Date-picker dialog after selecting a result */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add &ldquo;{selected?.title}&rdquo; to Charts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="evt-date">Event Date</Label>
              <Input
                id="evt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Pick the date to mark on the chart. Wikipedia search results don&apos;t always
              include a single date, so enter it manually.
            </p>
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm pt-2">
                <input
                  type="checkbox"
                  checked={pinToPublic}
                  onChange={(e) => setPinToPublic(e.target.checked)}
                  aria-label="Pin to public home"
                />
                Pin to public home
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!date || saving}>
              {saving ? "Saving…" : "Add to Charts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
