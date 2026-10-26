import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

type DownloadFile = { key: string; name: string; size: number; updatedAt: string; url: string; type: string };

const SUPPORTED_EXTENSIONS = new Set([
  "apk", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z", "config",
]);

function getClient() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) throw new Error("Storage não configurado");
  return new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
}

function endpoint() {
  const value = process.env.AWS_ENDPOINT_URL_S3;
  if (!value) throw new Error("Storage não configurado");
  return value.replace(/\/$/, "");
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"") ?? "";
}

function displayName(key: string) {
  const raw = key.replace(/^apks\//, "").replace(/^\d+--/, "");
  try { return decodeURIComponent(raw); } catch { return raw; }
}

async function listFiles(): Promise<DownloadFile[]> {
  const base = endpoint();
  const response = await getClient().fetch(`${base}/apks?list-type=2&prefix=apks%2F`);
  if (!response.ok) throw new Error("Não foi possível consultar o armazenamento");
  const xml = await response.text();
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((match) => match[1])
    .map((entry) => ({ key: xmlValue(entry, "Key"), size: Number(xmlValue(entry, "Size")), updatedAt: xmlValue(entry, "LastModified") }))
    .map((item) => {
      const name = displayName(item.key);
      const extension = name.split(".").pop()?.toLowerCase() ?? "";
      if (!SUPPORTED_EXTENSIONS.has(extension)) return null;
      return {
        key: item.key,
        name,
        type: extension.toUpperCase(),
        size: item.size || 0,
        updatedAt: item.updatedAt || new Date(0).toISOString(),
        url: `${base}/apks/${item.key.split("/").map(encodeURIComponent).join("/")}`,
      };
    })
    .filter((item): item is DownloadFile => item !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function formatSize(bytes: number) {
  if (!bytes) return "Tamanho indisponível";
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export default async function Home() {
  let files: DownloadFile[] = [];
  let unavailable = false;
  try { files = await listFiles(); } catch (error) { console.error("Failed to render downloads", error); unavailable = true; }

  return (
    <main className="tv-page">
      <header className="tv-header">
        <div className="tv-shell tv-header-inner">
          <div className="tv-brand">
            <span className="tv-logo" aria-hidden="true">▶</span>
            <span><strong>Central de Apps</strong><small>Aplicativos e documentos para baixar</small></span>
          </div>
          <span className="tv-verified">✓ Downloads verificados</span>
        </div>
      </header>

      <section className="tv-shell tv-content">
        <div className="tv-intro">
          <span className="tv-kicker">Arquivos disponíveis</span>
          <h1>Seus downloads,<br /><em>prontos para você.</em></h1>
          <p>Escolha um aplicativo ou documento abaixo e clique em baixar para abrir ou salvar o arquivo no seu dispositivo.</p>
          <a className="tv-refresh" href="/">↻ Atualizar lista</a>
        </div>

        {unavailable ? (
          <div className="tv-message tv-message-error"><strong>Lista temporariamente indisponível.</strong><span>Tente atualizar a página em alguns instantes.</span></div>
        ) : files.length === 0 ? (
          <div className="tv-message"><strong>Nenhum arquivo disponível</strong><span>Os novos arquivos aparecerão aqui automaticamente.</span></div>
        ) : (
          <div className="tv-grid">
            {files.map((file, index) => (
              <article className="tv-card" key={file.key}>
                <span className="tv-card-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="tv-package" aria-hidden="true">{file.type}</div>
                <h2>{file.name}</h2>
                <p>{formatSize(file.size)} <span>•</span> {formatDate(file.updatedAt)}</p>
                <a className="tv-download" href={file.url}>↓ Baixar arquivo</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
