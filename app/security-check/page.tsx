import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default async function SecurityCheckPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";

  return (
    <main className="noise min-h-screen px-4 py-10">
      <Container className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <section className="panel panel-border w-full max-w-xl rounded-[34px] p-7 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-gold),var(--accent-sky))] text-slate-950">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-coral)]">
            Mind Security Engine
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Quick human check</h1>
          <p className="muted mx-auto mt-3 max-w-md text-sm leading-6">
            We noticed unusual request behaviour. Confirm you are human, then you can continue safely.
          </p>
          <form action="/api/security/verify" method="post" className="mt-6 space-y-3">
            <input type="hidden" name="next" value={next} />
            <label className="block text-left text-sm font-semibold">
              Type ScholarMind
              <input
                name="answer"
                autoComplete="off"
                placeholder="ScholarMind"
                className="mt-2 w-full rounded-[20px] border border-white/14 bg-white/12 px-4 py-3 outline-none transition focus:border-[var(--accent-sky)]"
              />
            </label>
            <Button type="submit" className="w-full justify-center">
              Verify and continue
            </Button>
          </form>
          <Link href="/" className="muted mt-5 inline-block text-xs transition hover:text-[var(--fg)]">
            Return home
          </Link>
        </section>
      </Container>
    </main>
  );
}
