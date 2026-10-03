// npm: specifiers with exact versions, not a third-party CDN (AUDIT S-17).
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SITE_URL = Deno.env.get("SITE_URL");
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_URL ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SITE_URL) {
    console.error("[CREATE-CHECKOUT] SITE_URL is not set");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("[CREATE-CHECKOUT] STRIPE_SECRET_KEY is not set");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // Service role: reads and writes the user's `subscribers` row (RLS allows clients only to read).
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Fetch API instead of the Node http package (Supabase Edge runtime).
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
    // The Stripe customer belongs to the user ID, never to the e-mail (AUDIT S-12): a second
    // account with the same (unverified) e-mail must not reach another user's customer.
    const { data: subscriber, error: readError } = await supabaseClient
      .from("subscribers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (readError) throw new Error(`Failed to read subscriber: ${readError.message}`);
    let customerId: string | null = subscriber?.stripe_customer_id ?? null;
    let hasHadSubscription = false;
    if (customerId) {
      const existingSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
      hasHadSubscription = existingSubscriptions.data.length > 0;
    } else {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { user_id: user.id } },
        { idempotencyKey: `customer-${user.id}` } // two parallel checkouts create one customer
      );
      customerId = customer.id;
      const { error: upsertError } = await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (upsertError) throw new Error(`Failed to upsert subscriber: ${upsertError.message}`);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Sun Chaser Premium",
              description: "Line-of-sight sunrise/sunset analysis with terrain data"
            },
            unit_amount: 199, // $1.99
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      // Only new customers (never subscribed before) get the free trial.
      ...(hasHadSubscription ? {} : { subscription_data: { trial_period_days: 7 } }),
      success_url: `${SITE_URL}/?checkout=success`,
      cancel_url: `${SITE_URL}/?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-CHECKOUT] ERROR: ${errorMessage}`);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
