import { Registry, Counter, Histogram } from 'prom-client'

// Create a custom registry for our application
export const register = new Registry()

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'nextjs-capi-monitor'
})

// Histogram to track CAPI request duration
// Buckets: 200ms, 250ms, 300ms, 350ms, 400ms, 450ms, 500ms, 5000ms
export const capiDurationHistogram = new Histogram({
  name: 'capi_request_duration_milliseconds',
  help: 'Duration of CAPI requests in milliseconds',
  labelNames: ['status', 'event_name'],
  buckets: [200, 250, 300, 350, 400, 450, 500, 5000],
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
export function recordSuccessfulCapiRequest(durationMilliseconds: number, eventName: string) {
  capiDurationHistogram.observe({ status: 'success', event_name: eventName }, durationMilliseconds)
  capiRequestsTotal.inc({ status: 'success', event_name: eventName })
}

// Helper function to record failed CAPI request
export function recordFailedCapiRequest(durationMilliseconds: number, eventName: string, errorType: string) {
  capiDurationHistogram.observe({ status: 'error', event_name: eventName }, durationMilliseconds)
  capiRequestsTotal.inc({ status: 'error', event_name: eventName, error_type: errorType })
}
