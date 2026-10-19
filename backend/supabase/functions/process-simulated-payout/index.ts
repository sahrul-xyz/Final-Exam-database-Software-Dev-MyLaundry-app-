// Supabase Edge Function: process-simulated-payout
// Sesuai dengan spesifikasi PRD v1.2 Bab 9.7
// Otomasi pencairan dana simulasi (payout) setelah masa komplain 1 jam berakhir tanpa komplain terbuka

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
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // 1. Ambil pesanan selesai yang usianya sudah lebih dari 1 jam
    const { data: completedOrders, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, outlet_id, status, subtotal_estimate, final_service_amount, payment_method, updated_at")
      .eq("status", "completed")
      .lte("updated_at", oneHourAgo);

    if (orderError) {
      throw orderError;
    }

    const processedPayouts = [];

    if (completedOrders && completedOrders.length > 0) {
      for (const order of completedOrders) {
        // A. Cek apakah ada tiket komplain yang masih aktif/terbuka untuk pesanan ini
        const { data: openComplaints } = await supabase
          .from("complaints")
          .select("id, status")
          .eq("order_id", order.id)
          .eq("status", "open");

        if (openComplaints && openComplaints.length > 0) {
          // Ada komplain yang belum diselesaikan mitra -> Tahan dana (status: held)
          continue;
        }

        // B. Cek apakah pesanan ini sudah pernah diproses payout-nya (idempotensi)
        const idempotencyKey = `PAYOUT-SETTLE-${order.id}`;
        const { data: existingLedger } = await supabase
          .from("ledger_entries")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existingLedger) {
          // Sudah pernah diproses, lewati
          continue;
        }

        const grossAmount = Number(order.final_service_amount || order.subtotal_estimate || 0);
        const commissionRate = 0.05; // 5% snapshot komisi PRD Bab 9.3
        const commissionAmount = Math.round(grossAmount * commissionRate);

        // Jika pesanan digital: dana masuk ke marketplace, dicairkan ke mitra setelah dipotong komisi 5%
        // Jika pesanan tunai: mitra sudah terima uang tunai penuh dari pelanggan, maka komisi 5% menjadi piutang
        const isCash = order.payment_method === "cash";
        const cashDebtDeduction = isCash ? commissionAmount : 0;
        const netPayout = isCash ? 0 : Math.max(0, grossAmount - commissionAmount);

        // C. Catat ke tabel commission_entries
        await supabase.from("commission_entries").insert({
          order_id: order.id,
          outlet_id: order.outlet_id,
          rate_snapshot: commissionRate,
          basis_amount: grossAmount,
          commission_amount: commissionAmount,
          status: "settled",
        });

        // D. Buat entri mutasi di tabel ledger_entries
        await supabase.from("ledger_entries").insert([
          {
            outlet_id: order.outlet_id,
            order_id: order.id,
            entry_type: "order_settlement",
            amount: grossAmount,
            direction: "credit",
            idempotency_key: idempotencyKey,
          },
          {
            outlet_id: order.outlet_id,
            order_id: order.id,
            entry_type: "marketplace_commission",
            amount: commissionAmount,
            direction: "debit",
            idempotency_key: `COMM-DEBIT-${order.id}`,
          },
        ]);

        // E. Buat entri di tabel payouts
        if (!isCash && netPayout > 0) {
          await supabase.from("payouts").insert({
            outlet_id: order.outlet_id,
            amount_gross: grossAmount,
            commission_deduction: commissionAmount,
            cash_commission_debt_deduction: cashDebtDeduction,
            amount_net: netPayout,
            status: "eligible",
            eligible_at: now.toISOString(),
            processed_at: now.toISOString(),
          });
        }

        processedPayouts.push({
          orderNumber: order.order_number,
          grossAmount,
          commissionAmount,
          netPayout,
          paymentMethod: order.payment_method,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Berhasil memproses payout simulasi untuk ${processedPayouts.length} pesanan.`,
        processedCount: processedPayouts.length,
        details: processedPayouts,
        executedAt: now.toISOString(),
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
