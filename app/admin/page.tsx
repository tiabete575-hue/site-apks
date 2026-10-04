"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, CloudUpload, LockKeyhole, Package, Tv } from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setStatus("sending");
    setMessage("");
    const data = new FormData();
    data.set("password", password);
    data.set("file", file);
    try {
      const response = await fetch("/api/apks", { method: "POST", body: data });
      const result = (await response.json()) as { error?: string; name?: string };
      if (!response.ok) throw new Error(result.error ?? "Falha no envio.");
      setStatus("success");
      setMessage(`${result.name} foi publicado com sucesso.`);
      setFile(null);
      const input = document.getElementById("apk-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha no envio.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-10 inline-flex items-center gap-3 text-white/70 transition hover:text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] text-[#06140d]"><Tv size={21} /></span>
          <span className="font-extrabold">Central de Apps</span>
        </a>

        <div className="overflow-hidden rounded-[2rem] border border-white/9 bg-[#11141b] shadow-2xl shadow-black/25">
          <div className="border-b border-white/8 p-7 sm:p-10">
            <span className="mb-5 grid h-13 w-13 place-items-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/8 text-[var(--primary)]"><CloudUpload size={27} /></span>
            <h1 className="text-3xl font-black tracking-[-.045em] sm:text-4xl">Publicar novo APK</h1>
            <p className="mt-3 max-w-lg leading-7 text-white/50">Depois do envio, um novo botão de download aparecerá automaticamente na página dos seus clientes.</p>
          </div>

          <form onSubmit={upload} className="space-y-6 p-7 sm:p-10">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><LockKeyhole size={16} /> Senha de administrador</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Digite sua senha" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base outline-none transition placeholder:text-white/20 focus:border-[var(--primary)]/50 focus:ring-3 focus:ring-[var(--primary)]/10" />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><Package size={16} /> Arquivo APK</span>
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-5 transition focus-within:border-[var(--primary)]/50">
                <input id="apk-file" type="file" accept=".apk,application/vnd.android.package-archive" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full cursor-pointer text-sm text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white/8 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-white/12" />
                <p className="mt-3 text-xs text-white/30">Somente .apk · máximo de 100 MB</p>
              </div>
            </label>

            <button type="submit" disabled={!file || status === "sending"} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-black text-[#06140d] transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45">
              <CloudUpload size={19} /> {status === "sending" ? "Enviando…" : "Enviar e publicar"}
            </button>

            {message && <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${status === "success" ? "border-[var(--primary)]/20 bg-[var(--primary)]/8 text-[#9ff6ca]" : "border-red-400/20 bg-red-400/8 text-red-200"}`}>{status === "success" && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}<span>{message}</span></div>}
          </form>
        </div>
      </div>
    </main>
  );
}
