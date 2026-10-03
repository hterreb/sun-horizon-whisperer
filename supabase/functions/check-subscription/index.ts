// npm: specifiers with exact versions, not a third-party CDN (AUDIT S-17).
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SITE_URL = Deno.env.get("SITE_URL");
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_URL ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SITE_URL) {
    console.error("[CHECK-SUBSCRIPTION] SITE_URL is not set");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[CHECK-SUBSCRIPTION] STRIPE_SECRET_KEY is not set");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    logStep("Stripe key verified");

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
    logStep("Authenticating user with token");

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
      logStep("No customer found, updating unsubscribed state");
      // No stripe_customer_id here: a checkout running at the same time may have just set it.
      const { error: upsertError } = await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        trial_used: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (upsertError) throw new Error(`Failed to upsert subscriber: ${upsertError.message}`);
      return new Response(JSON.stringify({ subscribed: false, trial_used: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Check for active or trialing subscriptions
    const activeOrTrialSub = subscriptions.data.find((sub: Stripe.Subscription) =>
      sub.status === "active" || sub.status === "trialing"
    );

    const hasActiveSub = !!activeOrTrialSub;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    // Check if user has ever had a subscription (trial used)
    const trialUsed = subscriptions.data.length > 0;

    if (hasActiveSub) {
      const subscription = activeOrTrialSub!;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionTier = "Premium";
      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        status: subscription.status,
        endDate: subscriptionEnd
      });
    } else {
      logStep("No active subscription found");
    }

    const { error: upsertError } = await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_used: trialUsed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (upsertError) throw new Error(`Failed to upsert subscriber: ${upsertError.message}`);

    logStep("Updated database with subscription info", {
      subscribed: hasActiveSub,
      subscriptionTier,
      trialUsed
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_used: trialUsed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
