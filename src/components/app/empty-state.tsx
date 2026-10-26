import Link from "next/link";

export function NoData() {
  return (
    <p className="rounded-xl border p-6 text-sm">
      No data yet. <Link href="/upload" className="underline">Upload a file or load the sample data</Link>.
    </p>
  );
}
