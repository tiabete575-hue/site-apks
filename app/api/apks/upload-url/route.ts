import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const CONTENT_TYPES: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

function getClient() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage não configurado");
  }
  return new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
}

function endpoint() {
  const value = process.env.AWS_ENDPOINT_URL_S3;
  if (!value) throw new Error("Storage não configurado");
  return value.replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: unknown;
      name?: unknown;
      size?: unknown;
    };
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (
      !configuredPassword ||
      typeof body.password !== "string" ||
      body.password !== configuredPassword
    ) {
      return Response.json({ error: "Senha de administrador inválida." }, { status: 401 });
    }

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return Response.json({ error: "Selecione um arquivo válido." }, { status: 400 });
    }
    const extension = body.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      return Response.json({ error: "Formato não permitido. Use APK, PDF, Office, TXT, CSV, ZIP, RAR ou 7Z." }, { status: 400 });
    }
    if (
      typeof body.size !== "number" &&
      !(typeof body.size === "string" && /^\d+$/.test(body.size))
    ) {
      return Response.json({ error: "Tamanho de arquivo inválido." }, { status: 400 });
    }
    const size = Number(body.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return Response.json({ error: "O arquivo deve ter no máximo 100 MB." }, { status: 413 });
    }

    const safeName = body.name.replace(/[^a-zA-Z0-9._()\- ]/g, "-");
    const key = `apks/${Date.now()}--${encodeURIComponent(safeName)}`;
    const headers = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const uploadTarget = new URL(`${endpoint()}/apks/${encodedKey}`);
    uploadTarget.searchParams.set("X-Amz-Expires", "300");
    const signedRequest = await getClient().sign(uploadTarget, {
      method: "PUT",
      headers,
      aws: { signQuery: true },
    });

    return Response.json({
      name: safeName,
      uploadUrl: signedRequest.url,
      headers,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to create APK upload URL", error);
    return Response.json({ error: "Falha ao preparar o envio. Tente novamente." }, { status: 500 });
  }
}
