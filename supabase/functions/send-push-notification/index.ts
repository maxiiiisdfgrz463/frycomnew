import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "https://esm.sh/web-push@3.6.1";

// Default values for local development
const DEFAULT_SUBJECT = "mailto:example@example.com";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Get environment variables with fallbacks
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || DEFAULT_SUBJECT;

// Log environment variables for debugging
console.log("Environment variables check:");
console.log("VAPID_PUBLIC_KEY exists:", !!VAPID_PUBLIC_KEY);
console.log("VAPID_PRIVATE_KEY exists:", !!VAPID_PRIVATE_KEY);
console.log("VAPID_SUBJECT:", VAPID_SUBJECT);

// Configure web-push with VAPID keys if available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log("VAPID keys configured successfully");
  } catch (error) {
    console.error("Error configuring VAPID keys:", error);
  }
}

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    // Check if VAPID keys are available
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("Missing VAPID credentials");
      return new Response(
        JSON.stringify({
          error:
            "Server configuration error: Missing VAPID credentials. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables in your Supabase project settings.",
          missingKeys: {
            VAPID_PUBLIC_KEY: !VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY: !VAPID_PRIVATE_KEY,
          },
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { subscription, payload } = body;

    // Validate required fields
    if (!subscription || !payload) {
      console.error("Missing subscription or payload");
      return new Response(
        JSON.stringify({ error: "Missing subscription or payload" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Send the push notification
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log("Push notification sent successfully");

      return new Response(JSON.stringify({ success: true }), {
        headers: corsHeaders,
        status: 200,
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to send push notification",
          details: error.message,
        }),
        {
          headers: corsHeaders,
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error.message,
      }),
      {
        headers: corsHeaders,
        status: 500,
      },
    );
  }
});
