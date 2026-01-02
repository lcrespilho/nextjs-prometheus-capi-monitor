// Revalidate this page (and all its fetches) every now and then
export const revalidate = 10

import { recordFailedQualityRequest, recordSuccessfulQualityRequest, recordFailedStatsRequest, recordSuccessfulStatsRequest } from '@/lib/metrics'
import Link from 'next/link'

// Match the actual API response structure from Facebook Dataset Quality API
interface MatchKeyFeedback {
  identifier: string // e.g., "email", "ip_address", "user_agent", "external_id"
  coverage: {
    percentage: number // 0-100
  }
}

interface Diagnostics {
  name: string
  description: string
  solution: string
  percentage: number
  affected_event_count: number
  total_event_count: number
}

interface EventMatchQuality {
  composite_score: number // 0-10 decimal
  match_key_feedback: MatchKeyFeedback[]
  diagnostics: Diagnostics[]
}

interface WebEvent {
  event_name: string
  event_match_quality: EventMatchQuality
}

interface DatasetQualityResponse {
  web: WebEvent[]
}

interface EventCountData {
  value: string
  count: number
}

// Reference: https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api/
async function getQualityStats() {
  const startTime = performance.now()
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN
  if (!pixelId || !token) {
    console.error('Missing FB_PIXEL_ID or FB_ACCESS_TOKEN')
    return []
  }
  const endpoint = 'https://graph.facebook.com/v24.0/dataset_quality'
  const params = new URLSearchParams({
    dataset_id: pixelId,
    access_token: token,
    fields: 'web{event_match_quality,event_name}',
  })
  const res = await fetch(`${endpoint}?${params.toString()}`)
  const duration = Math.round(performance.now() - startTime) // milliseconds
  if (!res.ok) {
    const error = await res.json()
    console.error('FB Dataset Quality API Error:', error)
    recordFailedQualityRequest(duration, error.error?.type)
    return []
  }
  recordSuccessfulQualityRequest(duration)
  const data: DatasetQualityResponse = await res.json()
  // Parse the web events array
  const events = (data.web || []).map(event => ({
    event_name: event.event_name,
    composite_score: event.event_match_quality?.composite_score || 0,
    match_key_feedback: event.event_match_quality?.match_key_feedback || [],
  }))
  return events
}

// Reference: https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/stats/
async function getEventCounts() {
  const startTime = performance.now()
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN
  if (!pixelId || !token) {
    console.error('Missing FB_PIXEL_ID or FB_ACCESS_TOKEN for stats')
    return {}
  }
  // Get counts for last 24 hours
  const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60)
  const endpoint = `https://graph.facebook.com/v24.0/${pixelId}/stats`
  const params = new URLSearchParams({
    aggregation: 'event_total_counts',
    start_time: oneDayAgo.toString(),
    access_token: token,
  })
  const res = await fetch(`${endpoint}?${params.toString()}`)
  console.log('>>> dashboard stats fetch')
  const duration = Math.round(performance.now() - startTime) // milliseconds
  if (!res.ok) {
    const error = await res.json()
    console.error('FB Stats API Error:', error)
    recordFailedStatsRequest(duration, error.error?.type)
    return {}
  }
  recordSuccessfulStatsRequest(duration)
  const data = await res.json()
  // Structure: { data: [ { start_time: "...", aggregation: "event_total_counts", data: [ { value: "Lead", count: 403 }, ... ] } ] }
  const counts: Record<string, number> = {}
  if (data.data && data.data.length > 0 && data.data[0].data) {
    data.data[0].data.forEach((item: EventCountData) => {
      counts[item.value] = item.count
    })
  }
  return counts
}

export default async function DashboardPage() {
  // Fetch both data sources in parallel
  const [qualityEvents, eventCounts] = await Promise.all([
    getQualityStats(),
    getEventCounts()
  ])

  // Merge the data
  // We want to show all events that have EITHER quality data OR count data
  const allEventNames = new Set([
    ...qualityEvents.map(e => e.event_name),
    ...Object.keys(eventCounts)
  ])

  const events = Array.from(allEventNames).map(name => {
    const q = qualityEvents.find(e => e.event_name === name)
    const count = eventCounts[name] || 0

    return {
      event_name: name,
      composite_score: q?.composite_score || 0,
      match_key_feedback: q?.match_key_feedback || [],
      count: count
    }
  })

  // Sort events: prioritized by score (desc), then count (desc)
  events.sort((a, b) => {
    if (b.composite_score !== a.composite_score) return b.composite_score - a.composite_score
    return b.count - a.count
  })

  return (
    <main className="min-h-screen bg-slate-900 text-white p-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400">Dataset Quality Dashboard</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event: any, i: number) => (
          <div key={i} className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{event.event_name}</h2>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${event.composite_score >= 6 ? 'bg-green-900 text-green-300' :
                    event.composite_score > 0 ? 'bg-yellow-900 text-yellow-300' : 'bg-slate-700 text-slate-400'
                    }`}
                >
                  Score: {event.composite_score.toFixed(1)}/10
                </span>
              </div>

              <div className="space-y-4">
                {/* Match Key Feedback */}
                <div>
                  <div className="text-sm text-slate-400 mb-2">Match Key Coverage</div>
                  {event.match_key_feedback.length > 0 ? (
                    <div className="space-y-2">
                      {event.match_key_feedback.map((key: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-mono">{key.identifier}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{key.coverage.percentage.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${key.coverage.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No match key data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Event Counts */}
            <div className="bg-slate-700/30 p-3 rounded flex justify-between items-center mt-6 border-t border-slate-700/50">
              <span className="text-sm text-slate-400">Total Events (24h)</span>
              <span className="text-xl font-mono text-blue-200">{event.count.toLocaleString()}</span>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
            <p className="text-slate-400 mb-2">No Quality Data or Events Available Yet</p>
            <p className="text-xs text-slate-500">
              Note: Facebook's Quality API typically requires ~24-48 hours of consistent data.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
