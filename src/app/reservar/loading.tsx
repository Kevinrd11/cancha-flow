export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10">
      <div className="h-10 w-64 rounded-xl bg-forest/10" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] rounded-3xl bg-white" />
        <div className="h-80 rounded-3xl bg-white" />
      </div>
    </div>
  );
}
