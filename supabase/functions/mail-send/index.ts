 
// functions/mail-send/index.ts
// Deno (Supabase Edge Functions) + AWS SES v2

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  SESv2Client,
  SendEmailCommand
} from "npm:@aws-sdk/client-sesv2@3.654.0";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  AWS_REGION,
  SES_ACCESS_KEY_ID,
  SES_SECRET_ACCESS_KEY,
  SES_CONFIGURATION_SET
} = Deno.env.toObject();

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const ses = new SESv2Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: SES_ACCESS_KEY_ID!,
    secretAccessKey: SES_SECRET_ACCESS_KEY!
  }
});

type SendPayload = {
  businessId: string;
  campaignId: string;
  contactId: string;
  to: string;
  fromEmail: string;
  subject: string;
  html: string;
  text?: string;
  configurationSet?: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = (await req.json()) as SendPayload;

    // Basic validation
    for (const k of ["businessId","campaignId","contactId","to","fromEmail","subject","html"]) {
      // @ts-ignore
      if (!payload[k]) return new Response(`Missing ${k}`, { status: 400 });
    }

    // 1) Compliance gate: block unsubscribed emails
    const { data: unsub } = await supabase.rpc("is_email_unsubscribed", {
      p_business_id: payload.businessId,
      p_email: payload.to
    });
    if (unsub === true) {
      return new Response("Contact is unsubscribed", { status: 409 });
    }

    // 2) Send via SES v2
    const sendCmd = new SendEmailCommand({
      Destination: { ToAddresses: [payload.to] },
      FromEmailAddress: payload.fromEmail,
      Content: {
        Simple: {
          Subject: { Data: payload.subject },
          Body: {
            Html: { Data: payload.html },
            ...(payload.text ? { Text: { Data: payload.text } } : {})
          }
        }
      },
      ...(payload.configurationSet || SES_CONFIGURATION_SET
        ? { ConfigurationSetName: payload.configurationSet || SES_CONFIGURATION_SET }
        : {})
    });

    const result = await ses.send(sendCmd);

    // 3) Record the send
    await supabase
      .from("mail_campaign_sends")
      .insert({
        campaign_id: payload.campaignId,
        contact_id: payload.contactId,
        email_address: payload.to,
        status: "sent",
        sent_at: new Date().toISOString(),
        message_id: (result as any).MessageId ?? (result as any).$metadata?.requestId ?? null
      });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    // Log error in DB for visibility
    try {
      const body = await req.text().catch(() => "");
      await supabase.from("mail_error_logs").insert({
        business_id: null,
        campaign_id: null,
        contact_id: null,
        error_message: String(e?.message ?? e),
        details: { body }
      });
    } catch (_ignored) {}
    return new Response("Send failed", { status: 500 });
  }
});