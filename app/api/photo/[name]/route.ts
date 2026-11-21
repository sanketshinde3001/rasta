import fs from "fs";
import path from "path";
import { photoDir } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = path.basename((await params).name);
  try {
    const buf = fs.readFileSync(path.join(photoDir(), name));
    const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(buf, { headers: { "content-type": type, "cache-control": "public, max-age=31536000" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
