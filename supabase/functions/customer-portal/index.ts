// Exact npm versions in deno.json, pinned with deno.lock (AUDIT S-17).
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = Deno.env.get("SITE_URL");
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_URL ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SITE_URL) {
    console.error("[CUSTOMER-PORTAL] SITE_URL is not set");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[CUSTOMER-PORTAL] STRIPE_SECRET_KEY is not set");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Authentication failed", { message: userError?.message ?? "no email on user" });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Fetch API instead of the Node http package (Supabase Edge runtime).
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
    // The Stripe customer belongs to the user ID, never to the e-mail (AUDIT S-12).
    const { data: subscriber, error: readError } = await supabaseClient
      .from("subscribers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (readError) throw new Error(`Failed to read subscriber: ${readError.message}`);
    const customerId: string | null = subscriber?.stripe_customer_id ?? null;
    if (!customerId) {
      throw new Error("No Stripe customer found for this user");
    }
    logStep("Found Stripe customer", { customerId });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/`,
    });
    // Not the URL: it opens the billing portal for anyone who has it (AUDIT S-17).
    logStep("Customer portal session created", { sessionId: portalSession.id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
