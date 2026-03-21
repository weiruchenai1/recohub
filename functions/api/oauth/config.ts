interface Env {
  LINUXDO_CLIENT_ID: string
}

// GET /api/oauth/config — return public OAuth configuration
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.LINUXDO_CLIENT_ID || ''
  return new Response(JSON.stringify({
    linuxdo_enabled: !!clientId,
    linuxdo_client_id: clientId,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
