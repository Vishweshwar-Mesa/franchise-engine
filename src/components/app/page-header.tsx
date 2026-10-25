/** Editorial page header: eyebrow, serif title, one line of context, actions on the right. */
export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
      <div className="flex max-w-3xl flex-col gap-2">
        {eyebrow && <span className="text-xs font-semibold tracking-[0.08em] text-brand uppercase">{eyebrow}</span>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight md:text-3xl">{title}</h1>
        {sub && <p className="text-[15px] text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Rounded surface used for every section. */
export function Panel({ title, children, className = "", aside }: { title?: React.ReactNode; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={`flex flex-col gap-3 rounded-[20px] border bg-card p-5 text-sm ${className}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
