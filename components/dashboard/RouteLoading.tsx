type RouteLoadingProps = {
  title: string;
  copy: string;
};

export function RouteLoading({ title, copy }: RouteLoadingProps) {
  return (
    <main>
      <div className="px-3 pt-3 md:px-4">
        <div className="panel panel-border flex items-center justify-between rounded-[28px] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/20" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/20" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/12" />
            </div>
          </div>
          <div className="h-9 w-28 animate-pulse rounded-full bg-white/14" />
        </div>
      </div>

      <div className="px-3 pb-4 pt-3 md:px-4">
        <section className="panel panel-border rounded-[30px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-3 w-28 animate-pulse rounded-full bg-[rgba(255,125,89,0.24)]" />
              <div className="h-10 w-[min(32rem,80vw)] animate-pulse rounded-[20px] bg-white/14" />
              <p className="muted max-w-2xl text-sm md:text-base">{copy}</p>
            </div>
            <div className="glass rounded-[24px] px-4 py-3 text-sm">
              <p className="font-semibold">{title}</p>
              <p className="muted mt-1 text-xs">Loading your study material and workspace state.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          {[0, 1, 2].map((index) => (
            <div key={index} className="panel panel-border min-h-[26rem] rounded-[30px] p-4">
              <div className="space-y-3">
                <div className="h-5 w-28 animate-pulse rounded-full bg-white/16" />
                <div className="h-20 animate-pulse rounded-[24px] bg-white/12" />
                <div className="h-20 animate-pulse rounded-[24px] bg-white/10" />
                <div className="h-20 animate-pulse rounded-[24px] bg-white/10" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
