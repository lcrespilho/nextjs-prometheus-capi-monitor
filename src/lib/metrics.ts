import { Registry, Counter, Histogram } from 'prom-client'

// Create a custom registry for our application
export const register = new Registry()

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'nextjs-capi-monitor'
})

// Histogram to track CAPI request duration
// Buckets: 100ms, 500ms, 1s, 2s, 5s, 10s
export const capiDurationHistogram = new Histogram({
  name: 'capi_request_duration_seconds',
  help: 'Duration of CAPI requests in seconds',
  labelNames: ['status', 'event_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
})

// Counter to track total CAPI requests
export const capiRequestsTotal = new Counter({
  name: 'capi_requests_total',
  help: 'Total number of CAPI requests',
  labelNames: ['status', 'event_name', 'error_type'],
  registers: [register]
})

// Helper function to record successful CAPI request
export function recordSuccessfulCapiRequest(durationSeconds: number, eventName: string) {
  capiDurationHistogram.observe({ status: 'success', event_name: eventName }, durationSeconds)
  capiRequestsTotal.inc({ status: 'success', event_name: eventName })
}

// Helper function to record failed CAPI request
export function recordFailedCapiRequest(durationSeconds: number, eventName: string, errorType: string) {
  capiDurationHistogram.observe({ status: 'error', event_name: eventName }, durationSeconds)
  capiRequestsTotal.inc({ status: 'error', event_name: eventName, error_type: errorType })
}
