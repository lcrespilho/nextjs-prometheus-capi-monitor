import ConversionButton from '@/components/ConversionButton'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">CAPI Monitor Dashboard</h1>

        <p className="text-slate-400 text-center max-w-lg">
          This page demonstrates a Next.js App Router setup with Prometheus monitoring. Click the button below to
          simulate a conversion event sent to our custom Route Handler.
        </p>

        <div className="p-8 border border-slate-700 rounded-xl bg-slate-800/50">
          <ConversionButton />
        </div>
      </div>
    </main>
  )
}
