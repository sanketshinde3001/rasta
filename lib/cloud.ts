import "server-only";

// Cloudinary as tiny shared storage: one raw JSON file for app state, and uploaded photos.
// Configure with CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
function cloudUrl(): string | null {
  let v = (process.env.CLOUDINARY_URL || "").trim().replace(/^["']|["']$/g, "");
  v = v.replace(/^(CLOUDINARY_URL=)+/, ""); // tolerate a pasted "CLOUDINARY_URL=..." line
  return v.startsWith("cloudinary://") ? v : null;
}
export const cloudOn = () => !!cloudUrl();

let _cl: any = null;
async function cl() {
  if (_cl) return _cl;
  process.env.CLOUDINARY_URL = cloudUrl() || ""; // the SDK reads this when it loads
  const { v2 } = await import("cloudinary");
  v2.config({ secure: true });
  _cl = v2;
  return v2;
}

export async function cloudReadJson(publicId: string): Promise<any | null> {
  const c = await cl();
  let res: any;
  try {
    res = await c.api.resource(publicId, { resource_type: "raw", type: "upload" });
  } catch (e: any) {
    if (e?.error?.http_code === 404 || e?.http_code === 404) return null;
    throw e;
  }
  // secure_url carries the version, so the CDN never serves an old copy
  const r = await fetch(res.secure_url, { cache: "no-store" });
  if (!r.ok) throw new Error(`cloud fetch ${r.status}`);
  return r.json();
}

export async function cloudWriteJson(publicId: string, json: string) {
  const c = await cl();
  await c.uploader.upload(`data:application/json;base64,${Buffer.from(json).toString("base64")}`, {
    resource_type: "raw", public_id: publicId, overwrite: true, invalidate: true,
  });
}

export async function cloudUploadImage(dataUrl: string): Promise<string> {
  const c = await cl();
  const r = await c.uploader.upload(dataUrl, { folder: "rasta/photos", resource_type: "image" });
  return r.secure_url as string;
}
