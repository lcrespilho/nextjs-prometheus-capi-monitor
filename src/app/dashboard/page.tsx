export const dynamic = 'force-dynamic'

interface EventStat {
  event_name: string
  count: number
  value: number
}

interface MatchQuality {
  event_name: string
  score: number // 0-10
  match_rate_percentage: number
}

async function getQualityStats() {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN

  // CORRECTED: We query the Pixel ID and ask for specific fields
  // 1. event_stats: Gives us the total counts (browser + server)
  // 2. conversions_api_event_match_quality: Gives us the server-side match quality
  const endpoint = `https://graph.facebook.com/v24.0/${pixelId}`
  const fields = 'event_stats,conversions_api_event_match_quality'

  const res = await fetch(`${endpoint}?access_token=${token}&fields=${fields}`, { next: { revalidate: 0 } })

  if (!res.ok) {
    const errorData = await res.json()
    console.error('FB API Error:', errorData)
    return []
  }

  const data = await res.json()

  // Merge the two data sources based on event_name
  const stats = (data.event_stats?.data || []) as EventStat[]
  const quality = (data.conversions_api_event_match_quality?.data || []) as MatchQuality[]

  // Create a combined view
  const combined = stats.map(stat => {
    const q = quality.find(q => q.event_name === stat.event_name)
    return {
      event_name: stat.event_name,
      count: stat.count,
      score: q?.score || 0,
      match_rate: q?.match_rate_percentage || 0,
    }
  })

  return combined
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
                className={`px-2 py-1 rounded text-xs font-bold ${
                  event.score >= 6 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                }`}
              >
                Score: {event.score}/10
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1 text-slate-400">
                  <span>Match Rate</span>
                  <span>{Math.round(event.match_rate * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${event.match_rate * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-700/30 p-3 rounded flex justify-between items-center">
                <span className="text-sm text-slate-400">Total Events (24h)</span>
                <span className="text-xl font-mono">{event.count.toLocaleString()}</span>
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
