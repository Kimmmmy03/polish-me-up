// One-off script to upload homepage service photos to Supabase Storage.
// Usage:  node scripts/upload-homepage-images.mjs
import { readFile } from "node:fs/promises";
import "dotenv/config";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = tmpdir();
const FILES = [
  { src: join(TMP, "home.jpg"), dst: "homepage/at-home.jpg" },
  { src: join(TMP, "booth.jpg"), dst: "homepage/booth.jpg" },
  { src: join(TMP, "timing.jpg"), dst: "homepage/timing.jpg" },
];

for (const { src, dst } of FILES) {
  const buf = await readFile(src);
  const res = await fetch(
    `${URL}/storage/v1/object/service-images/${dst}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
        "cache-control": "public, max-age=604800",
      },
      body: buf,
    },
  );

  if (!res.ok) {
    console.error(`✗ ${dst} → HTTP ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    continue;
  }

  const publicUrl = `${URL}/storage/v1/object/public/service-images/${dst}`;
  console.log(`✓ ${dst} → ${publicUrl}`);
}
