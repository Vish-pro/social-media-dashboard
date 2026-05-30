import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Standard Meta Webhook subscription verification
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "socialpulse_secret_token";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Meta Webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    }
    
    return NextResponse.json({ error: "Forbidden: Verification failed" }, { status: 403 });
  } catch (error) {
    console.error("Meta Webhook Verification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Meta Webhook Event Received:", JSON.stringify(body, null, 2));

    // Here we would extract incoming comments or DMs, parse sender profiles, 
    // and store/upsert them into a unified InboxConversation / InboxMessage schema.
    // E.g., const messageText = body.entry?.[0]?.messaging?.[0]?.message?.text;

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error("Meta Webhook Payload Processing Error:", error);
    return NextResponse.json({ error: "Failed to parse webhook event" }, { status: 400 });
  }
}
