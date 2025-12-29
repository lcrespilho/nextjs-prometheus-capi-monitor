'use client'
import { useState } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export default function ConversionButton() {
  const [status, setStatus] = useState<string>('Idle')

  const triggerConversion = async () => {
    setStatus('Processing...')

    // 1. Generate a Unique Event ID (Critical for Deduplication)
    const eventId = crypto.randomUUID()
    // eslint-disable-next-line react-hooks/purity
    const eventTime = Math.floor(Date.now() / 1000)
    const email = 'lcrespilho@gmail.com'

    try {
      // 2. Fire Browser Pixel (The "Standard" Hit)
      if (window.fbq) {
        console.log(`Firing Browser Pixel (Lead) - ID: ${eventId}`)
        window.fbq(
          'track',
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
          event_time: eventTime,
          event_id: eventId,
          event_source_url: window.location.href,
          user_data: {
            email_hash: await hashEmail(email), // We must hash PII before sending!
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
    }

    // Reset status after 2 seconds
    setTimeout(() => setStatus('Idle'), 3000)
  }

  // Helper to SHA256 hash email (Required by CAPI)
  const hashEmail = async (email: string) => {
    const msgBuffer = new TextEncoder().encode(email.toLowerCase())
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={triggerConversion}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
      >
        Trigger &quot;Lead&quot; Event (Hybrid)
      </button>
      <span className="text-xs text-slate-400 font-mono max-w-md text-center break-all">{status}</span>
    </div>
  )
}
