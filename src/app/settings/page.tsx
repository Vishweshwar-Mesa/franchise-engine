"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/app/native-select";
import { SourceTag } from "@/components/app/source-tag";
import { CASE_ALLOWED_CITIES } from "@/lib/parse";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, STATE_ZONE, profileProblems, type ScoringProfile, type Settings } from "@/lib/settings";
import { useWorkspace } from "@/store/workspace";

type Path = (string | number)[];
function getAt(o: unknown, path: Path): unknown {
  return path.reduce<unknown>((a, k) => (a as Record<string | number, unknown>)?.[k], o);
}
function setAt<T>(o: T, path: Path, v: unknown): T {
  if (!path.length) return v as T;
  const [k, ...rest] = path;
  const copy = (Array.isArray(o) ? [...o] : { ...(o as object) }) as Record<string | number, unknown>;
  copy[k] = setAt(copy[k], rest, v);
  return copy as T;
}

export default function SettingsPage() {
  const saved = useWorkspace((s) => s.settings);
  const cities = useWorkspace((s) => s.dataset?.allowedCities ?? CASE_ALLOWED_CITIES);
  const [draft, setDraft] = useState<Settings>(saved);
  const [pi, setPi] = useState(0);
  const [msg, setMsg] = useState("");
  const p = draft.profiles[pi] ?? draft.profiles[0];
  const problems = [
    ...draft.profiles.flatMap((x) => profileProblems(x).map((m) => `${x.name}: ${m}`)),
    ...(!Number.isFinite(draft.lights.green) || !Number.isFinite(draft.lights.amber) ? ["Traffic lights need both thresholds."] : []),
  ];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const num = (path: Path, label: string, hint?: string) => (
    <div>
      <Label className="text-xs" htmlFor={path.join(".")}>{label}</Label>
      <Input
        id={path.join(".")}
        type="number"
        step="any"
        value={Number.isNaN(getAt(draft, path)) ? "" : String(getAt(draft, path) ?? "")}
        onChange={(e) => setDraft(setAt(draft, path, e.target.value === "" ? NaN : Number(e.target.value)))}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
  const prof = (path: Path, label: string, hint?: string) => num(["profiles", pi, ...path], label, hint);
  const matchSelect = (key: keyof ScoringProfile["match"], label: string, options: string[]) => (
    <div>
      <Label className="text-xs" htmlFor={`match-${key}`}>{label}</Label>
      <NativeSelect id={`match-${key}`} className="w-full" value={p.match[key] ?? ""} onChange={(e) => setDraft(setAt(draft, ["profiles", pi, "match", key], e.target.value || null))}>
        <option value="">Any</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </NativeSelect>
    </div>
  );
  const save = () => {
    if (problems.length) return;
    useWorkspace.getState().setSettings(draft, "Settings saved.");
    setMsg("Saved. Results re-calculated.");
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex max-w-3xl flex-col gap-1.5">
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase italic md:text-5xl">Settings</h1>
          <p className="text-muted-foreground">
            These are the rules used to check and score applicants. The locked ones come from the case. The rest are our starting values, and you can change any of them. When you save, every applicant is checked again straight away.
            New to this? Read the <a href="/guide" className="text-brand hover:underline">Guide</a>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { if (window.confirm("Reset every setting to the defaults?")) { setDraft(DEFAULT_SETTINGS); setPi(0); useWorkspace.getState().setSettings(DEFAULT_SETTINGS, "Settings reset to defaults."); setMsg("Reset to defaults."); } }}>Reset to defaults</Button>
          <Button disabled={!dirty || problems.length > 0} onClick={save}>Save settings</Button>
        </div>
      </div>
      {msg && <p className="text-[var(--tone-good)]">{msg}</p>}
      {problems.length > 0 && <ul className="list-disc rounded bg-[var(--tone-pin-bg)] p-2 pl-6 text-[var(--tone-pin)]">{problems.map((m) => <li key={m}>{m}</li>)}</ul>}

      <section className="space-y-2 rounded-[20px] border bg-card p-5">
        <h2 className="text-base font-semibold">Case rules (locked)</h2>
        <ul className="space-y-1">
          <li className="flex items-center gap-2"><SourceTag source="Case rule" /> The brand never opens two stores in the same pin code. Existing store on the pin → Hold: pin occupied. Two or more qualified applicants on one free pin → Needs your decision.</li>
          <li className="flex items-center gap-2"><SourceTag source="Case rule" /> Territory capacity = min(open slots, free pins). Qualified applicants beyond capacity → Waitlist. A contested pin holds one slot until decided.</li>
        </ul>
        <p className="text-xs text-muted-foreground">&quot;Case rule&quot; = written in the case file, so it cannot be changed. &quot;Our choice&quot; = a sensible default we picked; everything below is editable.</p>
      </section>

      <section className="space-y-3 rounded-[20px] border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">Checks <SourceTag source="Our choice" /></h2>
        <p className="text-muted-foreground">Checks decide when an applicant is put on &quot;Hold: info needed&quot; instead of being scored for a slot. Switch one off and those applicants are no longer held for that reason.</p>
        {([
          ["holdWhenNoSpace", "Hold when Space available = Not yet identified"],
          ["checkPinPrefix", "Hold when the pin prefix does not match the city (from Allowed values)"],
          ["checkContradictions", "Hold on contradictions (space vs size/floor, state vs city, AI-flagged notes once you confirm them)"],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <Switch checked={draft.checks[k]} onCheckedChange={(v) => setDraft(setAt(draft, ["checks", k], v))} /> {label}
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Always on (cannot be switched off, because the engine cannot work without them): required fields present, numbers are numbers, the pin has 6 digits, and a territory covers the pin
          (applicants are matched to territories by pin only). Also fixed: a blank &quot;Open slots&quot; counts as 0 (never guess a capacity), and ties in score are ordered by Application ID.
        </p>
      </section>

      <section className="grid gap-3 rounded-[20px] border bg-card p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold">Traffic lights <SourceTag source="Our choice" /></h2>
          <p className="text-muted-foreground">
            Every applicant gets one coloured dot per score factor (Space, Money, Experience, Financial profile), so you can read a profile at a glance without numbers.
            A dot is <b className="text-[var(--light-green)]">green</b> when the applicant earned at least the green share of that factor&apos;s points,
            <b className="text-[var(--light-amber)]"> amber</b> when they earned at least the amber share, and <b className="text-[var(--light-red)]">red</b> below that.
            For Money, Experience and Financial profile the points depend on how the applicant compares with the others in the file, so with the defaults green means roughly the top third and red the bottom third.
            A hollow dot means the information was not provided.
          </p>
        </div>
        {num(["lights", "green"], "Green from: share of the factor's points (0 to 1)", "Default 0.667, i.e. two thirds of the points or more.")}
        {num(["lights", "amber"], "Amber from: share of the factor's points (0 to 1)", "Default 0.333, i.e. one third or more. Below this is red.")}
      </section>

      <section className="grid gap-3 rounded-[20px] border bg-card p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold">Launch timing <SourceTag source="Our choice" /></h2>
          <p className="text-muted-foreground">
            Each application says how many months from now the applicant wants to open (&quot;Target launch&quot;). This is <b>never scored</b>: the case gives no rule for it.
            If you set a limit here, applicants who want to open sooner than the limit get a note (&quot;feasibility note&quot;) on their page, so you can check whether that is realistic. Leave it blank for no notes.
          </p>
        </div>
        <div>
          <Label className="text-xs" htmlFor="launch-limit">Feasibility limit in months (blank = no notes)</Label>
          <Input id="launch-limit" type="number" placeholder="not set" value={draft.launchLimitMonths ?? ""} onChange={(e) => setDraft({ ...draft, launchLimitMonths: e.target.value === "" ? null : Number(e.target.value) })} />
          <p className="text-[11px] text-muted-foreground">Example: 4 means anyone wanting to open in under 4 months gets a note. It never changes their score or status.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-[20px] border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">Onboarding check-ins <SourceTag source="Our choice" /></h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="checkin-base">Day 30/60/90/180 check-ins count from</Label>
          <NativeSelect id="checkin-base" value={draft.checkinBase} onChange={(e) => setDraft({ ...draft, checkinBase: e.target.value as Settings["checkinBase"] })}>
            <option value="softLaunch">Soft-launch date</option>
            <option value="day0">Day 0 (paperwork complete)</option>
          </NativeSelect>
        </div>
        <p className="text-xs text-muted-foreground">After a store opens, the reviewer checks in at day 30, 60, 90 and 180. Check-ins review how the open store is doing, so by default they count from the soft-launch (opening) date, not from when paperwork finished.</p>
      </section>

      <section className="space-y-4 rounded-[20px] border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 font-semibold">Scoring rubric profiles <SourceTag source="Our choice" /></h2>
          <NativeSelect value={pi} onChange={(e) => setPi(Number(e.target.value))}>
            {draft.profiles.map((x, i) => <option key={x.id} value={i}>{x.name}</option>)}
          </NativeSelect>
          <Button size="sm" variant="outline" onClick={() => {
            const copy: ScoringProfile = { ...structuredClone(p), id: `profile-${Date.now()}`, name: `${p.name} (copy)` };
            setDraft({ ...draft, profiles: [...draft.profiles, copy] });
            setPi(draft.profiles.length);
          }}>Copy as new profile</Button>
          {pi > 0 && <Button size="sm" variant="destructive" onClick={() => { setDraft({ ...draft, profiles: draft.profiles.filter((_, i) => i !== pi) }); setPi(0); }}>Delete profile</Button>}
        </div>
        <p className="text-muted-foreground">
          A profile is a set of scoring numbers for a region. Each applicant is scored with the profile that matches them most closely, so different regions can use different numbers.
        </p>
        <p className="text-xs text-muted-foreground">
          The most specific matching profile wins (Country → Zone → State → City), and every explanation names the profile used.
          Only &quot;Default (Karnataka)&quot; ships; other regions have no numbers until you add them. Zones follow the MHA Zonal Councils.
        </p>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-1"><Label className="text-xs" htmlFor="profile-name">Name</Label><Input id="profile-name" value={p.name} onChange={(e) => setDraft(setAt(draft, ["profiles", pi, "name"], e.target.value))} /></div>
          {matchSelect("country", "Country", ["India"])}
          {matchSelect("zone", "Zone", [...new Set(Object.values(STATE_ZONE))])}
          {matchSelect("state", "State", Object.keys(STATE_ZONE))}
          {matchSelect("city", "City", cities.map((c) => c.city))}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <h3 className="font-medium md:col-span-4">Factor weights: how many of the 100 points each factor is worth</h3>
          {prof(["weights", "space"], "Space")}
          {prof(["weights", "money"], "Money")}
          {prof(["weights", "experience"], "Experience")}
          {prof(["weights", "financial"], "Financial profile", "When blank for an applicant, the other three are rescaled to 100.")}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <h3 className="font-medium md:col-span-4">Space: how its points split between tenure (owned/rented), size and floor. &quot;Share&quot; = the fraction of those points an answer earns (1 = all, 0.5 = half).</h3>
          {prof(["spaceSplit", "tenure"], "Tenure points")}
          {prof(["spaceSplit", "size"], "Size points")}
          {prof(["spaceSplit", "floor"], "Floor points")}
          <div />
          {prof(["tenureRank", "Owned"], "Owned (share 0-1)")}
          {prof(["tenureRank", "Rented"], "Rented (share 0-1)")}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <h3 className="font-medium md:col-span-5">Size bands (sq ft): where small, medium and preferred begin, and the share of size points each earns</h3>
          {prof(["sizeBands", "smallBelow"], "Small-space risk below", "Go Colors management: stores under ~400 sq ft can't display the full range.")}
          {prof(["sizeBands", "preferredFrom"], "Preferred from", "Go Colors: newer stores are 700+ sq ft.")}
          {prof(["sizeRank", "small"], "Small (share 0-1)")}
          {prof(["sizeRank", "medium"], "Medium (share 0-1)")}
          {prof(["sizeRank", "preferred"], "Preferred (share 0-1)")}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <h3 className="font-medium md:col-span-4">Floor: share of floor points for each answer</h3>
          {prof(["floorRank", "Ground"], "Ground")}
          {prof(["floorRank", "Mall unit"], "Mall unit")}
          {prof(["floorRank", "Upper"], "Upper")}
          {prof(["floorRank", "Not known"], "Not known")}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <h3 className="font-medium md:col-span-5">Experience: years in retail (compared with others) plus how relevant their current business is</h3>
          {prof(["experienceSplit", "years"], "Years (relative)")}
          {prof(["experienceSplit", "relevance"], "Business relevance")}
          {prof(["relevanceRank", "High"], "High (share)")}
          {prof(["relevanceRank", "Medium"], "Medium (share)")}
          {prof(["relevanceRank", "Low"], "Low (share)")}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <h3 className="font-medium md:col-span-4">Financial profile: net worth and portfolio typed by the reviewer (compared with others who have one)</h3>
          {prof(["financialSplit", "netWorth"], "Net worth (relative)")}
          {prof(["financialSplit", "portfolio"], "Portfolio (relative)")}
        </div>
        <p className="text-xs text-muted-foreground">&quot;Compared with others&quot; means the applicant is ranked against everyone else in the uploaded file: the highest gets all the points, the lowest none, the rest in between (if only one applicant has a value, they get half).</p>
        {p.id === DEFAULT_PROFILE.id && <p className="text-xs text-muted-foreground">This is the shipped default profile.</p>}
      </section>
      <div className="flex justify-end"><Button disabled={!dirty || problems.length > 0} onClick={save}>Save settings</Button></div>
    </div>
  );
}
