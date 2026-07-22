export default function Loading() {
  return <div className="min-h-screen bg-paper"><div className="h-18 border-b border-line bg-white" /><div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6"><div className="h-12 w-3/4 rounded-xl bg-forest/10" /><div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]"><div className="h-96 rounded-3xl bg-white" /><div className="grid gap-6 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-96 rounded-3xl bg-white" />)}</div></div></div></div>;
}
