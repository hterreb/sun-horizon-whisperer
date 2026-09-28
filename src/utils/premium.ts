// Premium gating for line of sight with terrain (ROADMAP item 13/14). The feature
// ships free to everyone while PREMIUM_ENFORCED is false; flip it to true only once
// item 14 (premium gating: Supabase auth + Stripe checkout + check-subscription) is
// built - isLineOfSightEnabled will then need to also consult subscription status.

export const PREMIUM_ENFORCED = false;

export const isLineOfSightEnabled = (): boolean => !PREMIUM_ENFORCED;
