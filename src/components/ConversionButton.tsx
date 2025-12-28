'use client'
import { useState } from 'react'

export default function ConversionButton() {
  const [status, setStatus] = useState<string>('Idle')

  const triggerConversion = async () => {
    setStatus('Sending...')
    try {
      // We are calling our own backend API here
      const res = await fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          user_data: { email: 'test@example.com' },
        }),
      })
      if (res.ok) {
        setStatus('Success! Event Sent.')
      } else {
        setStatus('Failed (API not ready?)')
      }
    } catch (error) {
      setStatus('Error calling API')
    }

    // Reset status after 2 seconds
    setTimeout(() => setStatus('Idle'), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={triggerConversion}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
      >
        Trigger ViewContent Event
      </button>
      <span className="texst-sm text-gray-400 font-mono">{status}</span>
    </div>
  )
}
