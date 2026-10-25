"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LedgerEntry } from "@/lib/engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { FactorLights } from "./traffic-light";
import { WhyButton } from "./why-button";

export function ApplicantsTable({ rows, showTotal }: { rows: LedgerEntry[]; showTotal: boolean }) {
  const router = useRouter();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Pin</TableHead>
          <TableHead>Territory</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>{showTotal ? "Total" : "Space · Money · Exp · Fin"}</TableHead>
          <TableHead>Rank</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id} className="cursor-pointer" onClick={() => router.push(`/applicant/${encodeURIComponent(e.id)}`)}>
            <TableCell className="font-mono text-xs"><Link href={`/applicant/${encodeURIComponent(e.id)}`} onClick={(ev) => ev.stopPropagation()} className="underline-offset-2 hover:underline">{e.id}</Link></TableCell>
            <TableCell>{e.name || <span className="text-muted-foreground">missing</span>}</TableCell>
            <TableCell>{e.city}</TableCell>
            <TableCell className="font-mono text-xs">{e.pin}</TableCell>
            <TableCell>{e.territory?.id ?? "—"}</TableCell>
            <TableCell onClick={(ev) => ev.stopPropagation()}>
              <div className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                <WhyButton entry={e} />
                {e.flags.some((f) => f.kind === "liabilities") && <span title="Liabilities noted" className="text-xs text-[var(--tone-pin)]">⚠</span>}
              </div>
            </TableCell>
            <TableCell><FactorLights factors={e.factors} total={e.total} showTotal={showTotal} /></TableCell>
            <TableCell className="text-xs">
              {e.rank ? `${e.rank}/${e.rankOf}` : "—"}
              {e.waitlistPosition ? ` · WL #${e.waitlistPosition}` : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
