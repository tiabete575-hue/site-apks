import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

const BUCKET = "apks";

function getClient() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) throw new Error("Storage não configurado");
  return new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
}

function publicUrl(key: string) {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) return "";
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${endpoint.replace(/\/$/, "")}/${BUCKET}/${encoded}`;
}

function displayName(key: string) {
  const raw = key.replace(/^apks\//, "").replace(/^\d+--/, "");
  return decodeURIComponent(raw);
}

function storageUrl(path = "") {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) throw new Error("Storage não configurado");
  return `${endpoint.replace(/\/$/, "")}/${BUCKET}${path}`;
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"") ?? "";
}

export async function GET() {
  try {
    const response = await getClient().fetch(storageUrl("?list-type=2&prefix=apks%2F"));
    if (!response.ok) throw new Error(`Storage respondeu ${response.status}`);
    const xml = await response.text();
    const entries = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => match[1]);
    const apks = entries
      .map((entry) => ({ key: xmlValue(entry, "Key"), size: Number(xmlValue(entry, "Size")), updatedAt: xmlValue(entry, "LastModified") }))
      .filter((item) => item.key.toLowerCase().endsWith(".apk"))
      .map((item) => ({
        key: item.key,
        name: displayName(item.key),
        size: item.size || 0,
        updatedAt: item.updatedAt || new Date(0).toISOString(),
        url: publicUrl(item.key),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return Response.json({ apks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to list APKs", error);
    return Response.json({ error: "Não foi possível carregar os APKs." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword || password !== configuredPassword) {
      return Response.json({ error: "Senha de administrador inválida." }, { status: 401 });
    }

    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".apk")) {
      return Response.json({ error: "Selecione um arquivo com extensão .apk." }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return Response.json({ error: "O arquivo deve ter no máximo 100 MB nesta versão." }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._()\- ]/g, "-");
    const key = `apks/${Date.now()}--${encodeURIComponent(safeName)}`;
    const body = new Uint8Array(await file.arrayBuffer());
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const response = await getClient().fetch(storageUrl(`/${encodedKey}`), {
      method: "PUT",
      body,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${safeName.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (!response.ok) throw new Error(`Storage respondeu ${response.status}`);
    return Response.json({ ok: true, name: safeName }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload APK", error);
    return Response.json({ error: "Falha ao enviar o APK. Tente novamente." }, { status: 500 });
  }
}
