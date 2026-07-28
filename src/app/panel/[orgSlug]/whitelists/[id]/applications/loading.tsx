export default function ApplicationsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-neutral-900 rounded-lg w-2/3" />
      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-32 bg-neutral-900 rounded" />
              <div className="h-3 w-40 bg-neutral-900 rounded" />
            </div>
            <div className="h-3 w-16 bg-neutral-900 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
