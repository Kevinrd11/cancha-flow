export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="border-b border-line bg-white px-4 py-6 sm:px-7 lg:px-10">
        <div className="h-3 w-20 rounded bg-forest/10" />
        <div className="mt-3 h-11 w-56 rounded-xl bg-forest/10" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-forest/5" />
      </div>
      <div className="grid gap-6 p-4 sm:p-7 lg:p-9">
        <div className="h-28 rounded-3xl bg-white" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-40 rounded-2xl bg-white" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-96 rounded-3xl bg-white" />
          <div className="h-96 rounded-3xl bg-white" />
        </div>
        <div className="h-80 rounded-3xl bg-white" />
      </div>
    </div>
  );
}
