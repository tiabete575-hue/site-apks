"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Package, RefreshCw, ShieldCheck, Tv } from "lucide-react";

type Apk = { key: string; name: string; size: number; updatedAt: string; url: string };

function formatSize(bytes: number) {
  if (!bytes) return "Tamanho indisponível";
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

export default function Home() {
  const [apks, setApks] = useState<Apk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/apks", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar os aplicativos.");
      const data = (await response.json()) as { apks: Apk[] };
      setApks(data.apks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-white/8 bg-[#090b10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary)] text-[#06140d] shadow-[0_0_28px_rgba(53,232,145,.18)]"><Tv size={23} strokeWidth={2.3} /></span>
            <div><p className="text-lg font-extrabold tracking-[-.03em]">Central de Apps</p><p className="text-xs font-medium text-white/45">Atualizações para sua TV Box</p></div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-white/55 sm:flex"><ShieldCheck size={17} className="text-[var(--primary)]" />Downloads verificados</div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-10 grid gap-7 border-b border-white/8 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/8 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--primary)]">Versões mais recentes</span>
            <h1 className="text-4xl font-black leading-[1.02] tracking-[-.055em] sm:text-6xl">Seus aplicativos,<span className="block text-white/45">prontos para instalar.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">Escolha o aplicativo abaixo e toque em baixar. Depois, abra o arquivo na sua TV Box para concluir a atualização.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Atualizar lista</button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-red-200"><p className="font-bold">A lista está temporariamente indisponível.</p><p className="mt-1 text-sm text-red-200/70">{error}</p></div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-3xl border border-white/7 bg-white/4" />)}</div>
        ) : apks.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-white/12 bg-white/[.025] p-8 text-center"><div><Package className="mx-auto mb-4 text-white/25" size={38} /><h2 className="text-xl font-bold">Nenhum aplicativo disponível</h2><p className="mt-2 text-sm text-white/45">Os novos APKs aparecerão aqui automaticamente.</p></div></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apks.map((apk, index) => (
              <article key={apk.key} className="group relative overflow-hidden rounded-3xl border border-white/8 bg-[#11141b] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30">
                <span className="absolute right-5 top-5 text-xs font-black tabular-nums text-white/12">{String(index + 1).padStart(2, "0")}</span>
                <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl border border-white/8 bg-white/5 text-[var(--primary)]"><Package size={24} /></div>
                <h2 className="line-clamp-2 min-h-14 pr-8 text-xl font-extrabold leading-7 tracking-[-.02em]">{apk.name}</h2>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-white/38"><span>{formatSize(apk.size)}</span><span>·</span><span>{new Date(apk.updatedAt).toLocaleDateString("pt-BR")}</span></div>
                <a href={apk.url} download className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-[#06140d] transition hover:bg-[var(--primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[#11141b]"><Download size={18} /> Baixar APK</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
