'use client'
import { useState } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export default function ConversionButton() {
  const [status, setStatus] = useState<string>('Idle')
  const [loading, setLoading] = useState(false)

  const triggerConversion = async () => {
    setStatus('Processing...')
    setLoading(true)

    // 1. Generate a Unique Event ID (Critical for Deduplication)
    const eventId = crypto.randomUUID()

    try {
      // 2. Fire Browser Pixel (The "Standard" Hit)
      if (window.fbq) {
        console.log(`Firing Browser Pixel (Lead) - ID: ${eventId}`)
        window.fbq(
          'trackSingle',
          process.env.NEXT_PUBLIC_FB_PIXEL_ID,
          'Lead',
          { currency: 'USD', value: 10.0 }, // Event Data
          { eventID: eventId } // Deduplication Param
        )
      }

      // 3. Fire Server CAPI (The "Backup" Hit)
      const res = await fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'Lead',
          event_id: eventId,
          event_source_url: window.location.href,
          user_data: {
            email_hash: process.env.NEXT_PUBLIC_EMAIL_HASH,
          },
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus(`Sent! FB Trace ID: ${data.fb_trace_id}`)
      } else {
        setStatus(`Error: ${JSON.stringify(data.error)}`)
      }
    } catch (error) {
      console.error(error)
      setStatus('System Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={triggerConversion}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
      >
        {loading ? 'Processing...' : 'Trigger "Lead" Event (Hybrid)'}
      </button>
      <span className="text-xs text-slate-400 font-mono max-w-md text-center break-all">{status}</span>
    </div>
  )
}
