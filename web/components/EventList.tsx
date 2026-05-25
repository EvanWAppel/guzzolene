"use client";

import { useState, useTransition } from "react";
import type { WorldEvent } from "@/lib/db/schema";
import { deleteEvent, updateEvent } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EventList({ events }: { events: WorldEvent[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (events.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pinned Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {events.map((e) =>
            editingId === e.id ? (
              <EditRow key={e.id} event={e} onDone={() => setEditingId(null)} />
            ) : (
              <Row key={e.id} event={e} onEdit={() => setEditingId(e.id)} />
            ),
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function Row({ event, onEdit }: { event: WorldEvent; onEdit: () => void }) {
  const [pending, start] = useTransition();
  function handleDelete() {
    if (!window.confirm(`Delete event "${event.name}"?`)) return;
    start(async () => {
      await deleteEvent(event.id);
    });
  }
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="flex-1 min-w-0">
        <span className="font-medium">{event.name}</span>
        {event.userId === null && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">public</span>
        )}
      </div>
      <span className="font-mono text-xs text-muted-foreground">{event.date}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete} disabled={pending}>
          {pending ? "…" : "Delete"}
        </Button>
      </div>
    </li>
  );
}

function EditRow({ event, onDone }: { event: WorldEvent; onDone: () => void }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [pending, start] = useTransition();

  function handleSave() {
    start(async () => {
      await updateEvent(event.id, { name, date });
      onDone();
    });
  }

  return (
    <li className="flex items-center gap-2 py-2 text-sm">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1" />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
      <Button size="sm" onClick={handleSave} disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
    </li>
  );
}
