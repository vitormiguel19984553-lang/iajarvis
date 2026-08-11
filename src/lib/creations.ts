import { supabase } from "@/integrations/supabase/client";

export type CreationRow = {
  id: string;
  tool_id: string;
  tool_label: string;
  kind: "image" | "audio" | "text";
  prompt: string | null;
  output_text: string | null;
  storage_path: string | null;
  created_at: string;
};

export async function listCreations(limit = 60): Promise<CreationRow[]> {
  const { data } = await supabase
    .from("creations")
    .select("id,tool_id,tool_label,kind,prompt,output_text,storage_path,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CreationRow[];
}

export async function signCreation(path: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from("creations").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function saveCreation(input: {
  userId: string;
  toolId: string;
  toolLabel: string;
  kind: CreationRow["kind"];
  prompt: string;
  outputText?: string;
  file?: { blob: Blob; ext: string };
}): Promise<CreationRow | null> {
  let storagePath: string | null = null;

  if (input.file) {
    storagePath = `${input.userId}/${crypto.randomUUID()}.${input.file.ext}`;
    const { error } = await supabase.storage
      .from("creations")
      .upload(storagePath, input.file.blob, {
        contentType: input.file.blob.type || undefined,
        upsert: false,
      });
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("creations")
    .insert({
      user_id: input.userId,
      tool_id: input.toolId,
      tool_label: input.toolLabel,
      kind: input.kind,
      prompt: input.prompt.slice(0, 4000),
      output_text: input.outputText?.slice(0, 100_000) ?? null,
      storage_path: storagePath,
    })
    .select("id,tool_id,tool_label,kind,prompt,output_text,storage_path,created_at")
    .maybeSingle();

  if (error) throw error;
  return (data as CreationRow) ?? null;
}

export async function deleteCreation(row: CreationRow) {
  if (row.storage_path) {
    await supabase.storage.from("creations").remove([row.storage_path]);
  }
  await supabase.from("creations").delete().eq("id", row.id);
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
