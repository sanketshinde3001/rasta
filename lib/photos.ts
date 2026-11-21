import "server-only";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { photoDir } from "./store";

export function savePhoto(dataUrl: string): { url: string; data: string; type: string } {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("bad image");
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const name = crypto.randomBytes(8).toString("hex") + "." + ext;
  fs.writeFileSync(path.join(photoDir(), name), Buffer.from(m[3], "base64"));
  return { url: `/api/photo/${name}`, data: m[3], type: m[1] };
}

export function loadPhoto(url: string | null | undefined): { data: string; type: string } | null {
  if (!url) return null;
  try {
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
