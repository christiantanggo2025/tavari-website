import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // ✅ Only parse JSON once
    let body;
    try {
      body = await req.json();
      console.log("🪵 Parsed body received:", JSON.stringify(body));
    } catch (err) {
      console.error("💥 JSON parse error:", err.message);
      return new Response(JSON.stringify({ error: "Invalid JSON received" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const { saleId, businessId } = body;

    if (!saleId || !businessId) {
      return new Response("Missing saleId or businessId", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const helcimResponse = await fetch("https://api.helcim.com/v1/transaction/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "aa7V85IRKNT9kgLNZUWW6QNpsyEpTBC*zp!isDzkSFqXKjA@RBU_!LaUOUeiMaSz",
        search: { description: `${businessId}-${saleId}` },
      }),
    });

    const responseText = await helcimResponse.text();

    let helcimData;
    try {
      helcimData = JSON.parse(responseText);
    } catch (jsonErr) {
      console.error("💥 Helcim returned invalid JSON:", responseText);
      return new Response(JSON.stringify({ error: "Helcim returned non-JSON response" }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const approved = helcimData.response?.transactions?.find(
      (t: any) =>
        t.description?.includes(`${businessId}-${saleId}`) &&
        t.result === "APPROVED"
    );

    return new Response(JSON.stringify({ approved: !!approved }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    console.error("🔥 Function error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
