import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.json()
  const cookieStore = cookies()

  // Try to get the fbp cookie (Browser ID) for better matching
  const fbp = (await cookieStore).get('_fbp')?.value
  const fbc = (await cookieStore).get('_fbc')?.value

  // Get IP and User Agent (Critical for CAPI)
  const userIp = request.headers.get('x-forwarded-for') || '127.0.0.1'
  const userAgent = request.headers.get('user-agent') || ''

  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN

  // Construct the CAPI Payload
  const payload = {
    data: [
      {
        event_name: body.event_name,
        event_time: body.event_time || Math.floor(Date.now() / 1000),
        event_id: body.event_id, // Important for deduplication // TODO: generate
        event_source_url: body.event_source_url,
        user_data: {
          em: [body.user_data.email_hash], // SHA256 hashed email
          client_ip_address: userIp,
          client_user_agent: userAgent,
          fbp: fbp,
          fbc: fbc,
        },
        action_source: 'website',
      },
    ],
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v24.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Facebook API Error:', data)
      return NextResponse.json({ success: false, error: data }, { status: 400 })
    }

    return NextResponse.json({ success: true, fb_trace_id: data.fbtrace_id })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
