// supabase/functions/helcim-payment-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json();

    // Helcim sends a sale ID or custom reference — extract it
    const saleReference = body?.saleReference;
    const paymentStatus = body?.status;

    if (!saleReference || !paymentStatus) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Only proceed if payment was successful
    if (paymentStatus !== "APPROVED") {
      return new Response("Payment not approved", { status: 200 });
    }

    // You might format saleReference like "BUSINESSID-123"
    const [businessId, saleId] = saleReference.split("-");

    if (!businessId || !saleId) {
      return new Response("Invalid reference format", { status: 400 });
    }

    const { error } = await supabase
      .from("pos_sales")
      .update({ is_paid: true, updated_at: new Date().toISOString() })
      .eq("id", saleId)
      .eq("business_id", businessId);

    if (error) {
      console.error("Update error:", error);
      return new Response("Failed to update sale", { status: 500 });
    }

    return new Response("Sale marked as paid", { status: 200 });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
});
