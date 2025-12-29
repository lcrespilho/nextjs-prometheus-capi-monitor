export const dynamic = 'force-dynamic' // Always fetch fresh data

async function getPixelQuality() {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const token = process.env.FB_ACCESS_TOKEN

  // Fetch from Meta Graph API
  const res = await fetch(`https://graph.facebook.com/v24.0/${pixelId}/stats?access_token=${token}&aggregation=1d`, {
    next: { revalidate: 0 },
  })

  return res.json()
}

export default async function DashboardPage() {
  const data = await getPixelQuality()
  const events = data.data || []

  return (
    <main className="min-h-screen bg-slate-900 text-white p-12">
      <h1 className="text-3xl font-bold mb-8">Data Quality Dashboard</h1>

      <div className="grid gap-6">
        {events.map((event: unknown, i: number) => (
          <div key={i} className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-400">{event.event_name}</h2>
              <span className="text-xs text-slate-400">Last 24h</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-700/50 p-3 rounded">
                <div className="text-2xl font-mono">{event.match_rate}%</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Match Rate</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded">
                {/* Deduplication Rate might not appear immediately for new events */}
                <div className="text-2xl font-mono">{event.deduplication_rate || 0}%</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Dedup Rate</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded">
                <div className="text-2xl font-mono">{event.count || 0}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Total Events</div>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="text-slate-500 italic">
            No stats available yet. Facebook takes 15-30 mins to update stats after the first event.
          </div>
        )}
      </div>
    </main>
  )
}
