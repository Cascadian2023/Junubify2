const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  // Deliberately fail closed until a provider is selected, merchant onboarding is
  // complete, and a server-side adapter can create and verify real checkouts.
  return jsonResponse(503, {
    error: 'payments_not_configured',
    message: 'Checkout is unavailable until a payment provider is configured and verified.',
  });
});
