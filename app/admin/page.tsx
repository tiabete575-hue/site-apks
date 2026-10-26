"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, CloudUpload, Download, FileText, LockKeyhole, Pencil, RefreshCw, Save, Trash2, Tv, X } from "lucide-react";

type StoredFile = {
  key: string;
  name: string;
  size: number;
  updatedAt: string;
  url: string;
  type: string;
};

type ApiResult = {
  error?: string;
  files?: StoredFile[];
  file?: StoredFile;
  name?: string;
  uploadUrl?: string;
  headers?: Record<string, string>;
};

const ACCEPTED_FILES = ".apk,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.config";

function formatSize(bytes: number) {
  if (!bytes) return "Tamanho indisponível";
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [editingKey, setEditingKey] = useState("");
  const [editName, setEditName] = useState("");

  async function loadFiles(showSuccess = true) {
    if (!password) {
      setListMessage("Digite a senha de administrador para ver os arquivos.");
      return;
    }
    setLoadingFiles(true);
    setListMessage("");
    try {
      const response = await fetch("/api/admin/files", {
        headers: { Authorization: `Bearer ${password}` },
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as ApiResult | null;
      if (!response.ok) throw new Error(result?.error ?? `Falha ao carregar arquivos (${response.status}).`);
      setFiles(result?.files ?? []);
      if (showSuccess) setListMessage(`${result?.files?.length ?? 0} arquivo(s) publicado(s).`);
    } catch (error) {
      setListMessage(error instanceof Error ? error.message : "Falha ao carregar arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function adminAction(action: "rename" | "delete", payload: { key: string; name?: string }) {
    const response = await fetch("/api/admin/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${password}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = (await response.json().catch(() => null)) as ApiResult | null;
    if (!response.ok) throw new Error(result?.error ?? `Falha ao alterar arquivo (${response.status}).`);
    return result;
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/apks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, name: file.name, size: file.size }),
      });
      const result = (await response.json().catch(() => null)) as ApiResult | null;
      if (!response.ok || !result?.uploadUrl || !result.headers) {
        throw new Error(result?.error ?? `Não foi possível iniciar o envio (${response.status}).`);
      }

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: result.headers,
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`O armazenamento recusou o arquivo (${uploadResponse.status}).`);
      }

      setStatus("success");
      setMessage(`${result.name ?? file.name} foi publicado com sucesso.`);
      setFile(null);
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      void loadFiles(false);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha no envio.");
    }
  }

  async function saveRename(item: StoredFile) {
    setBusyKey(item.key);
    setListMessage("");
    try {
      await adminAction("rename", { key: item.key, name: editName });
      setEditingKey("");
      setEditName("");
      await loadFiles(false);
      setListMessage("Nome do arquivo atualizado.");
    } catch (error) {
      setListMessage(error instanceof Error ? error.message : "Não foi possível renomear o arquivo.");
    } finally {
      setBusyKey("");
    }
  }

  async function deleteFile(item: StoredFile) {
    if (!window.confirm(`Excluir “${item.name}” permanentemente?`)) return;
    setBusyKey(item.key);
    setListMessage("");
    try {
      await adminAction("delete", { key: item.key });
      setFiles((current) => current.filter((fileItem) => fileItem.key !== item.key));
      setListMessage(`${item.name} foi excluído.`);
    } catch (error) {
      setListMessage(error instanceof Error ? error.message : "Não foi possível excluir o arquivo.");
    } finally {
      setBusyKey("");
    }
  }

  function beginRename(item: StoredFile) {
    setEditingKey(item.key);
    setEditName(item.name);
    setListMessage("");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-white sm:py-14">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="mb-8 inline-flex items-center gap-3 text-white/70 transition hover:text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] text-[#06140d]"><Tv size={21} /></span>
          <span className="font-extrabold">Central de Apps</span>
        </a>

        <div className="mb-8">
          <span className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.16em] text-[var(--primary)]"><LockKeyhole size={15} /> Painel administrativo</span>
          <h1 className="text-3xl font-black tracking-[-.045em] sm:text-4xl">Arquivos publicados</h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/50">Envie novos arquivos, confira os já publicados, altere seus nomes ou remova os que não são mais necessários.</p>
        </div>

        <label className="mb-6 block max-w-xl">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><LockKeyhole size={16} /> Senha de administrador</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" className="h-12 w-full rounded-xl border border-white/10 bg-[#11141b] px-4 text-base outline-none transition placeholder:text-white/20 focus:border-[var(--primary)]/50 focus:ring-3 focus:ring-[var(--primary)]/10" />
        </label>

        <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-white/9 bg-[#11141b] shadow-2xl shadow-black/20">
          <div className="border-b border-white/8 p-6 sm:p-8">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/8 text-[var(--primary)]"><CloudUpload size={25} /></span>
            <h2 className="text-2xl font-black tracking-[-.035em]">Publicar arquivo</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Formatos aceitos: APK, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP, RAR e 7Z. Limite de 100 MB por arquivo.</p>
          </div>

          <form onSubmit={upload} className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><FileText size={16} /> Escolha o arquivo</span>
              <div className="rounded-xl border border-dashed border-white/15 bg-black/15 p-4 transition focus-within:border-[var(--primary)]/50">
                <input id="document-file" type="file" accept={ACCEPTED_FILES} required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full cursor-pointer text-sm text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white/8 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-white/12" />
                {file && <p className="mt-3 truncate text-xs text-white/40">{file.name} · {formatSize(file.size)}</p>}
              </div>
            </label>

            <button type="submit" disabled={!file || !password || status === "sending"} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-black text-[#06140d] transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45">
              <CloudUpload size={18} /> {status === "sending" ? "Enviando…" : "Enviar e publicar"}
            </button>
            {message && <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm sm:col-span-2 ${status === "success" ? "border-[var(--primary)]/20 bg-[var(--primary)]/8 text-[#9ff6ca]" : "border-red-400/20 bg-red-400/8 text-red-200"}`}>{status === "success" && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}<span>{message}</span></div>}
          </form>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-white/9 bg-[#11141b] shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-black tracking-[-.035em]">Biblioteca</h2>
              <p className="mt-1 text-sm text-white/40">Visualize, renomeie ou exclua arquivos publicados.</p>
            </div>
            <button type="button" onClick={() => void loadFiles()} disabled={!password || loadingFiles} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-white/75 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
              <RefreshCw size={16} className={loadingFiles ? "animate-spin" : ""} /> {loadingFiles ? "Carregando…" : "Ver arquivos"}
            </button>
          </div>

          {listMessage && <p role="status" className="border-b border-white/8 px-6 py-3 text-sm text-white/60 sm:px-8">{listMessage}</p>}

          {files.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-white/35 sm:px-8">Digite a senha e selecione “Ver arquivos” para carregar a biblioteca.</div>
          ) : (
            <ul className="divide-y divide-white/7">
              {files.map((item) => {
                const editing = editingKey === item.key;
                const busy = busyKey === item.key;
                return (
                  <li key={item.key} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="grid h-11 min-w-11 place-items-center rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-2 text-[10px] font-black text-[var(--primary)]">{item.type}</span>
                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(item); if (event.key === "Escape") setEditingKey(""); }} className="h-10 min-w-48 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-[var(--primary)]/50" />
                            <button type="button" onClick={() => void saveRename(item)} disabled={busy || !editName.trim()} aria-label="Salvar nome" className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary)] text-[#06140d] disabled:opacity-40"><Save size={16} /></button>
                            <button type="button" onClick={() => setEditingKey("")} aria-label="Cancelar" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60"><X size={16} /></button>
                          </div>
                        ) : (
                          <p className="truncate font-bold text-white/90">{item.name}</p>
                        )}
                        <p className="mt-1 text-xs text-white/35">{formatSize(item.size)} <span className="px-1">·</span> {formatDate(item.updatedAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <a href={item.url} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/65 transition hover:bg-white/5"><Download size={14} /> Baixar</a>
                      <button type="button" onClick={() => beginRename(item)} disabled={busy || editing} aria-label={`Renomear ${item.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/65 transition hover:bg-white/5 disabled:opacity-35"><Pencil size={15} /></button>
                      <button type="button" onClick={() => void deleteFile(item)} disabled={busy} aria-label={`Excluir ${item.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/20 text-red-300/80 transition hover:bg-red-400/10 disabled:opacity-35"><Trash2 size={15} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
