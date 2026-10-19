// Supabase Edge Function: expire-orders
// Sesuai dengan spesifikasi PRD v1.2 Bab 9.7
// Otomasi pembatalan pesanan yang melewati tenggat waktu (15 menit digital / 30 menit tunai)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    // 1. Cari pesanan yang sudah melewati batas tenggat
    // - digital: pending_payment lewat dari payment_deadline (15 menit)
    // - tunai: pending_partner lewat dari partner_response_deadline (30 menit)
    const { data: expiredOrders, error: findError } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_deadline, partner_response_deadline")
      .or(`and(status.eq.pending_payment,payment_deadline.lt.${now}),and(status.eq.pending_partner,partner_response_deadline.lt.${now})`);

    if (findError) {
      throw findError;
    }

    const results = [];

    if (expiredOrders && expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        // A. Ubah status pesanan menjadi expired
        await supabase
          .from("orders")
          .update({
            status: "expired",
            updated_at: now,
          })
          .eq("id", order.id);

        // B. Catat di order_status_history
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          old_status: order.status,
          new_status: "expired",
          changed_by: null,
          note:
            order.status === "pending_payment"
              ? "Pesanan kedaluwarsa otomatis: Melewati batas waktu pembayaran digital 15 menit."
              : "Pesanan kedaluwarsa otomatis: Mitra tidak mengonfirmasi pesanan tunai dalam batas 30 menit.",
        });

        // C. Lepas kapasitas harian yang sebelumnya ditahan (committed/held -> released)
        await supabase
          .from("capacity_reservations")
          .update({
            status: "released",
            released_at: now,
          })
          .eq("order_id", order.id);

        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          previousStatus: order.status,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Berhasil memproses ${results.length} pesanan kedaluwarsa.`,
        expiredOrdersCount: results.length,
        details: results,
        executedAt: now,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
