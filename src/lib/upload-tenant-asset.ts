import { supabase } from "@/lib/supabase";

export async function uploadTenantAsset(
  tenantId: string,
  folder: "logo" | "card-bg",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${tenantId}/${folder}-${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage.from("tenant-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
  return data.publicUrl;
}
