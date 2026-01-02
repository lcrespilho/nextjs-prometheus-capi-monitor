import { Registry, Counter, Histogram } from 'prom-client'

// Use a global variable to ensure the registry is a singleton across the application,
// specifically between the Next.js App Router (RSC) and API Routes contexts.
// @ts-ignore
const globalAny = global as any

export const register = globalAny.prometheusRegistry = globalAny.prometheusRegistry || new Registry()

// Add default labels to all metrics
// We wrap this in a check or just let it overwrite (it's safe to overwrite)
register.setDefaultLabels({
  app: 'nextjs-capi-monitor'
})

// Helpers to avoid "Metric already registered" errors during hot reload
function getOrCreateHistogram(config: any): Histogram<string> {
  const existing = register.getSingleMetric(config.name) as Histogram<string>
  if (existing) return existing
  return new Histogram({ ...config, registers: [register] })
}

function getOrCreateCounter(config: any): Counter<string> {
  const existing = register.getSingleMetric(config.name) as Counter<string>
  if (existing) return existing
  return new Counter({ ...config, registers: [register] })
}

const buckets = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 2000]

// Histogram to track CAPI request duration
// Buckets: 50ms...2000ms
const capiDurationHistogram = getOrCreateHistogram({
  name: 'capi_request_duration_milliseconds',
  help: 'Duration of CAPI requests in milliseconds',
  labelNames: ['status', 'event_name'],
  buckets: buckets,
})

// Counter to track total CAPI requests
const capiRequestsTotal = getOrCreateCounter({
  name: 'capi_requests_total',
  help: 'Total number of CAPI requests',
  labelNames: ['status', 'event_name', 'error_type'],
})

// Helper function to record successful CAPI request
export function recordSuccessfulCapiRequest(durationMilliseconds: number, eventName: string) {
  capiDurationHistogram.observe({ status: 'success', event_name: eventName }, durationMilliseconds)
  capiRequestsTotal.inc({ status: 'success', event_name: eventName })
}

// Helper function to record failed CAPI request
export function recordFailedCapiRequest(durationMilliseconds: number, eventName: string, errorType: string) {
  capiDurationHistogram.observe({ status: 'error', event_name: eventName }, durationMilliseconds)
  capiRequestsTotal.inc({ status: 'error', event_name: eventName, error_type: errorType })
}


// Histogram to track Dataset Quality API request duration
const qualityDurationHistogram = getOrCreateHistogram({
  name: 'quality_request_duration_milliseconds',
  help: 'Duration of Dataset Quality API requests in milliseconds',
  labelNames: ['status'],
  buckets: buckets,
})

// Counter to track total Dataset Quality API requests
const qualityRequestsTotal = getOrCreateCounter({
  name: 'quality_requests_total',
  help: 'Total number of Dataset Quality API requests',
  labelNames: ['status', 'error_type'],
})

// Helper function to record successful Dataset Quality API request
export function recordSuccessfulQualityRequest(durationMilliseconds: number) {
  qualityDurationHistogram.observe({ status: 'success' }, durationMilliseconds)
  qualityRequestsTotal.inc({ status: 'success' })
}

// Helper function to record failed Dataset Quality API request
export function recordFailedQualityRequest(durationMilliseconds: number, errorType: string) {
  qualityDurationHistogram.observe({ status: 'error' }, durationMilliseconds)
  qualityRequestsTotal.inc({ status: 'error', error_type: errorType })
}


// Histogram to track Stats API request duration
const statsDurationHistogram = getOrCreateHistogram({
  name: 'stats_request_duration_milliseconds',
  help: 'Duration of Stats API requests in milliseconds',
  labelNames: ['status'],
  buckets: buckets,
})

// Counter to track total Stats API requests
const statsRequestsTotal = getOrCreateCounter({
  name: 'stats_requests_total',
  help: 'Total number of Stats API requests',
  labelNames: ['status', 'error_type'],
})

// Helper function to record successful Stats API request
export function recordSuccessfulStatsRequest(durationMilliseconds: number) {
  statsDurationHistogram.observe({ status: 'success' }, durationMilliseconds)
  statsRequestsTotal.inc({ status: 'success' })
}

// Helper function to record failed Stats API request
export function recordFailedStatsRequest(durationMilliseconds: number, errorType: string) {
  statsDurationHistogram.observe({ status: 'error' }, durationMilliseconds)
  statsRequestsTotal.inc({ status: 'error', error_type: errorType })
}