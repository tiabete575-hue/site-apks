import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

const BUCKET = "apks";
const SUPPORTED_EXTENSIONS = new Set([
  "apk", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z",
]);

type StoredFile = {
  key: string;
  name: string;
  size: number;
  updatedAt: string;
  url: string;
  type: string;
};

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

function storageUrl(path = "") {
  return `${endpoint()}/${BUCKET}${path}`;
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]
    ?.replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"') ?? "";
}

function displayName(key: string) {
  const raw = key.replace(/^apks\//, "").replace(/^\d+--/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function storedFile(entry: string): StoredFile | null {
  const key = xmlValue(entry, "Key");
  if (!key.startsWith(`${BUCKET}/`)) return null;
  const name = displayName(key);
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) return null;
  return {
    key,
    name,
    type: extension.toUpperCase(),
    size: Number(xmlValue(entry, "Size")) || 0,
    updatedAt: xmlValue(entry, "LastModified") || new Date(0).toISOString(),
    url: storageUrl(`/${encodeKey(key)}`),
  };
}

function isAuthorized(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  const authorization = request.headers.get("authorization") ?? "";
  return Boolean(expected && authorization === `Bearer ${expected}`);
}

function validKey(key: unknown): key is string {
  return typeof key === "string" &&
    key.startsWith(`${BUCKET}/`) &&
    !key.split("/").some((part) => part === ".." || part === ".") &&
    !key.includes("\\");
}

async function listFiles() {
  const response = await getClient().fetch(storageUrl("?list-type=2&prefix=apks%2F"));
  if (!response.ok) throw new Error(`Storage respondeu ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((match) => storedFile(match[1]))
    .filter((file): file is StoredFile => file !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Senha de administrador inválida." }, { status: 401 });
  }
  try {
    return Response.json({ files: await listFiles() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to list admin files", error);
    return Response.json({ error: "Não foi possível carregar os arquivos." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Senha de administrador inválida." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      action?: unknown;
      key?: unknown;
      name?: unknown;
    };

    if (body.action === "delete") {
      if (!validKey(body.key)) {
        return Response.json({ error: "Arquivo inválido." }, { status: 400 });
      }
      const response = await getClient().fetch(storageUrl(`/${encodeKey(body.key)}`), { method: "DELETE" });
      if (!response.ok) throw new Error(`Storage respondeu ${response.status}`);
      return Response.json({ ok: true });
    }

    if (body.action === "rename") {
      if (!validKey(body.key) || typeof body.name !== "string") {
        return Response.json({ error: "Dados para renomear inválidos." }, { status: 400 });
      }
      const currentName = displayName(body.key);
      const currentExtension = currentName.split(".").pop()?.toLowerCase() ?? "";
      const safeName = body.name.trim().replace(/[^a-zA-Z0-9._()\- ]/g, "-");
      const newExtension = safeName.split(".").pop()?.toLowerCase() ?? "";
      if (!safeName || !SUPPORTED_EXTENSIONS.has(newExtension) || newExtension !== currentExtension) {
        return Response.json({ error: "Mantenha o mesmo formato do arquivo ao renomeá-lo." }, { status: 400 });
      }

      const newKey = `${BUCKET}/${Date.now()}--${encodeURIComponent(safeName)}`;
      const copySource = `/${BUCKET}/${encodeKey(body.key)}`;
      const copied = await getClient().fetch(storageUrl(`/${encodeKey(newKey)}`), {
        method: "PUT",
        headers: { "x-amz-copy-source": copySource },
      });
      const copyBody = await copied.text();
      if (!copied.ok || /<Error>/.test(copyBody)) {
        throw new Error(`Storage não conseguiu copiar o arquivo (${copied.status})`);
      }

      const removed = await getClient().fetch(storageUrl(`/${encodeKey(body.key)}`), { method: "DELETE" });
      if (!removed.ok) throw new Error("Arquivo renomeado, mas a cópia antiga não pôde ser removida.");
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    console.error("Failed to modify admin file", error);
    return Response.json({ error: "Não foi possível alterar o arquivo." }, { status: 500 });
  }
}
