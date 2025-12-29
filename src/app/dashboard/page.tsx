export const dynamic = 'force-dynamic'

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

async function getQualityStats() {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN_DATASET_QUALITY_API

  if (!pixelId || !token) {
    console.error('Missing FB_PIXEL_ID or FB_ACCESS_TOKEN_DATASET_QUALITY_API')
    return []
  }

  // Reference: https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api/
  const endpoint = 'https://graph.facebook.com/v24.0/dataset_quality'
  const params = new URLSearchParams({
    dataset_id: pixelId,
    access_token: token,
    fields: 'web{event_match_quality,event_name}',
    // fields: 'web{event_match_quality{composite_score,match_key_feedback,diagnostics},event_name}', // it's the same as above
  })

  const res = await fetch(`${endpoint}?${params.toString()}`, {
    next: { revalidate: 0 },
    cache: 'no-store'
  })

  if (!res.ok) {
    const errorData = await res.json()
    console.error('FB Dataset Quality API Error:', errorData)
    return []
  }

  const data: DatasetQualityResponse = await res.json()
  // console.log('> data:', JSON.stringify(data, null, 2))

  // Parse the web events array
  const events = (data.web || []).map(event => ({
    event_name: event.event_name,
    composite_score: event.event_match_quality?.composite_score || 0,
    match_key_feedback: event.event_match_quality?.match_key_feedback || [],
  }))

  // console.log('> event:', JSON.stringify(events, null, 2))
  return events
}

export default async function DashboardPage() {
  const events = await getQualityStats()

  return (
    <main className="min-h-screen bg-slate-900 text-white p-12">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">Dataset Quality Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event: any, i: number) => (
          <div key={i} className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{event.event_name}</h2>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${event.composite_score >= 6 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
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
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
            <p className="text-slate-400 mb-2">No Quality Data Available Yet</p>
            <p className="text-xs text-slate-500">
              Note: Facebook's Quality API typically requires ~24-48 hours of consistent data.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
