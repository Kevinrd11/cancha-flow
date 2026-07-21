export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line bg-white px-4 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between lg:px-10">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[.18em] text-forest/55">{eyebrow}</p>}
        <h1 className="display mt-1 text-4xl font-black uppercase sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
