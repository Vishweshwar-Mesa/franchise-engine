"use client";
import { useWorkspace } from "@/store/workspace";

export default function ActivityPage() {
  const log = useWorkspace((s) => s.log);
  const sessionId = useWorkspace((s) => s.sessionId);
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Activity log</h1>
      <p className="text-xs text-muted-foreground">Every reviewer action in this browser session ({sessionId.slice(0, 8)}…), newest first.</p>
      {log.length === 0 && <p className="text-sm">Nothing yet.</p>}
      <ul className="space-y-1 text-sm">
        {log.map((l, i) => (
          <li key={i} className="border-b py-1">
            <span className="font-mono text-xs text-muted-foreground">{new Date(l.at).toLocaleString()}</span>{" "}
            <span className="rounded bg-muted px-1 text-xs">{l.kind}</span>{" "}
            {l.applicantId && <span className="font-mono text-xs">{l.applicantId} </span>}
            {l.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
