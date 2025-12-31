import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { recordSuccessfulCapiRequest, recordFailedCapiRequest } from '@/lib/metrics'

export async function POST(request: Request) {
  const startTime = performance.now()
  const body = await request.json()
  const eventName = body.event_name || 'unknown'

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
        event_name: eventName,
        event_time: Math.random() < 0.95 ? Math.floor(Date.now() / 1000) : undefined, // adiciona 5% de falha em eventos CAPI
        // event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id,
        event_source_url: body.event_source_url,
        user_data: {
          ...(body.user_data?.email_hash ? { em: [body.user_data.email_hash] } : {}),
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
    const duration = Math.round((performance.now() - startTime)) // milliseconds

    if (!response.ok) {
      console.error('Facebook API Error:', data)
      recordFailedCapiRequest(duration, eventName, data.error?.type || 'unknown_error')
      return NextResponse.json({ success: false, error: data }, { status: 400 })
    }

    recordSuccessfulCapiRequest(duration, eventName)
    return NextResponse.json({ success: true, fb_trace_id: data.fbtrace_id })
  } catch (error) {
    const duration = Math.round((performance.now() - startTime)) // milliseconds
    recordFailedCapiRequest(duration, eventName, 'internal_error')
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
