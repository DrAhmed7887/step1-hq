import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type SyncRequest = {
  action: "push" | "pull";
  syncKey: string;
  payload?: unknown;
};

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashSyncKey(syncKey: string) {
  const encoded = new TextEncoder().encode(syncKey);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Supabase env vars are missing." }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      }
    );
  }

  try {
    const body = (await request.json()) as SyncRequest;

    if (!body.syncKey) {
      return new Response(JSON.stringify({ error: "syncKey is required." }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const syncHash = await hashSyncKey(body.syncKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (body.action === "push") {
      const { error } = await supabase.from("sync_snapshots").upsert(
        {
          sync_hash: syncHash,
          payload: body.payload,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "sync_hash"
        }
      );

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const { data, error } = await supabase
      .from("sync_snapshots")
      .select("payload, updated_at")
      .eq("sync_hash", syncHash)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data || { payload: null }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Sync failed." }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      }
    );
  }
});
