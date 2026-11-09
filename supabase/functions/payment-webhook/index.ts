const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provider-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  // Never accept a browser redirect or an unverified webhook as proof of payment.
  // Implement provider-specific signature verification and idempotent processing
  // before enabling this endpoint.
  return jsonResponse(503, {
    error: 'webhook_not_configured',
    message: 'Payment notifications are disabled until a provider adapter and signature verification are configured.',
  });
});
