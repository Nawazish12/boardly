import crypto from "crypto";

export function slugify(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}


export async function generateUniqueSlug(Model, name) {
  const base = slugify(name) || "org";
  let slug = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await Model.exists({ slug });
    if (!exists) return slug;
    slug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
  }
  return `${base}-${crypto.randomBytes(6).toString("hex")}`;
}
