import "server-only";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { photoDir } from "./store";
import { cloudOn, cloudUploadImage } from "./cloud";

export async function savePhoto(dataUrl: string): Promise<{ url: string; data: string; type: string }> {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("bad image");
  if (cloudOn()) {
    const url = await cloudUploadImage(dataUrl);
    return { url, data: m[3], type: m[1] };
  }
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const name = crypto.randomBytes(8).toString("hex") + "." + ext;
  fs.writeFileSync(path.join(photoDir(), name), Buffer.from(m[3], "base64"));
  return { url: `/api/photo/${name}`, data: m[3], type: m[1] };
}

export async function loadPhoto(url: string | null | undefined): Promise<{ data: string; type: string } | null> {
  if (!url) return null;
  try {
    if (/^https?:\/\//.test(url)) {
      const r = await fetch(url);
      if (!r.ok) return null;
      const type = r.headers.get("content-type") || "image/jpeg";
      return { data: Buffer.from(await r.arrayBuffer()).toString("base64"), type: type.split(";")[0] };
    }
    if (url.startsWith("/api/photo/")) {
      const name = path.basename(url);
      const buf = fs.readFileSync(path.join(photoDir(), name));
      return { data: buf.toString("base64"), type: name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg" };
    }
    if (url.startsWith("/samples/")) {
      const buf = fs.readFileSync(path.join(process.cwd(), "public", url));
      return { data: buf.toString("base64"), type: "image/jpeg" };
    }
  } catch {}
  return null;
}
