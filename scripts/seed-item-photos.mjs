// One-off seed: read local generated photos, upload to Supabase
// Storage under service-images/items/<slug>-<n>.<ext>, then patch
// public.items.photo_urls for each row by item name.
//
// Usage:  node scripts/seed-item-photos.mjs
import "dotenv/config";
import fs from "fs";
import path from "path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

const SLUG = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Item-name → 3 local photo names */
const PHOTOS = {
  "Manicure": [
    "manicure.png",
    "manicure_2.png",
    "manicure_3.png",
  ],
  "Pedicure": [
    "pedicure.png",
    "pedicure_2.png",
    "pedicure_3.png",
  ],
  "Mani + Pedi": [
    "mani_pedi.png",
    "mani_pedi_2.png",
    "mani_pedi_3.png",
  ],
  "Mani + Hand Spa": [
    "mani_hand_spa.png",
    "mani_hand_spa_2.png",
    "mani_hand_spa_3.png",
  ],
  "Pedi + Foot Spa": [
    "pedi_foot_spa.png",
    "pedi_foot_spa_2.png",
    "pedi_foot_spa_3.png",
  ],
  "Manicure (Walk-in)": [
    "manicure_walkin.png",
    "manicure_walkin_2.png",
    "manicure_walkin_3.png",
  ],
  "Press-on Nails (Short)": [
    "press_on_short.png",
    "press_on_short_2.png",
    "press_on_short_3.png",
  ],
  "Press-on Nails (Medium)": [
    "press_on_medium.png",
    "press_on_medium_2.png",
    "press_on_medium_3.png",
  ],
  "Press-on Nails (Long)": [
    "press_on_long.png",
    "press_on_long_2.png",
    "press_on_long_3.png",
  ],
  "Gel": [
    "gel_nails.png",
    "gel_nails_2.png",
    "gel_nails_3.png",
  ],
  "Nail Kit (Small)": [
    "nail_kit_small.png",
    "nail_kit_small_2.png",
    "nail_kit_small_3.png",
  ],
  "Nail Kit (Large)": [
    "nail_kit_large.png",
    "nail_kit_large.png",
    "nail_kit_large.png",
  ],
};

async function uploadOne(slug, idx, photoName) {
  const ext = path.extname(photoName);
  const dst = `items/${slug}-${idx + 1}${ext}`;
  const localPath = path.join(process.cwd(), "scripts", "generated-photos", photoName);

  // Read local file
  const buf = fs.readFileSync(localPath);
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";

  // Upload (upsert) to Supabase Storage
  const upRes = await fetch(
    `${URL}/storage/v1/object/service-images/${dst}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
        "cache-control": "public, max-age=604800",
      },
      body: buf,
    },
  );
  if (!upRes.ok) {
    const t = await upRes.text();
    throw new Error(`Upload ${dst} → HTTP ${upRes.status} ${t}`);
  }

  return `${URL}/storage/v1/object/public/service-images/${dst}`;
}

async function patchItem(itemName, urls) {
  // PostgREST update by name. The service-role key bypasses RLS.
  const res = await fetch(
    `${URL}/rest/v1/items?name=eq.${encodeURIComponent(itemName)}`,
    {
      method: "PATCH",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        photo_urls: urls,
        photo_url: urls[0],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Patch ${itemName} → HTTP ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  return rows.length;
}

let ok = 0;
for (const [name, photoNames] of Object.entries(PHOTOS)) {
  const slug = SLUG(name);
  try {
    const urls = [];
    for (let i = 0; i < photoNames.length; i++) {
      urls.push(await uploadOne(slug, i, photoNames[i]));
    }
    const rowsTouched = await patchItem(name, urls);
    if (rowsTouched === 0) {
      console.warn(`! ${name} - no matching row in items`);
    } else {
      console.log(`✓ ${name} → ${urls.length} photos, ${rowsTouched} row updated`);
      ok += 1;
    }
  } catch (err) {
    console.error(`✗ ${name} - ${err.message}`);
  }
}

console.log(`\nDone: ${ok}/${Object.keys(PHOTOS).length} items seeded.`);
