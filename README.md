# Next.js Prometheus CAPI Monitor

A specialized Next.js application designed to monitor Meta Conversions API (CAPI) request latency and success/failure rates. It integrates [Prometheus](https://prometheus.io/) via `prom-client` to expose custom metrics, enabling real-time observability of your CAPI implementation.

## Features

- **Prometheus Integration**: Uses `prom-client` to collect and expose metrics at `/api/metrics`.
- **CAPI Monitoring**: Tracks key performance indicators for Meta Conversions API requests:
    - **`capi_request_duration_seconds`**: Histogram tracking request latency.
    - **`capi_requests_total`**: Counter tracking total requests, labeled by status (`success`, `error`) and error type.
- **Additional API Monitoring**: Includes monitoring for Dataset Quality and Stats APIs.
- **Visual Dashboard**: A built-in dashboard at `/dashboard` to visualize CAPI healthy and event counts from the last 24 hours.
- **Meta Graph API v24.0**: Direct integration with the following Meta's Graph APIs:
    - **Dataset Quality API**: Tracks dataset quality metrics.
    - **Stats API**: Tracks dataset stats metrics.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Meta Pixel ID and Access Token (for actual CAPI requests)

## Getting Started

### 1. Installation

Install the dependencies:

```bash
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory and add your Meta credentials:

```bash
NEXT_PUBLIC_FB_PIXEL_ID=your_pixel_id

# mock email hash for testing
NEXT_PUBLIC_EMAIL_HASH=your_email_hash

# Meta access token with the following permissions: ads_management, ads_read, business_management, read_insights
# You must create an App (https://developers.facebook.com/apps) and get the access token for this App from Meta Business Manager
FB_ACCESS_TOKEN=your_access_token
```

### 3. Running the Development Server

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Viewing Metrics

Once the server is running, Prometheus metrics are available at:

[http://localhost:3000/api/metrics](http://localhost:3000/api/metrics)

You can configure your Prometheus scraper to target this endpoint.

## Project Structure

- **`src/lib/metrics.ts`**: Singleton registry for Prometheus metrics. Defines custom histograms and counters.
- **`src/app/api/metrics/route.ts`**: API route that exposes the registry's metrics for scraping.
- **`src/app/api/capi/route.ts`**: Handles CAPI events, proxies them to Facebook's Graph API, and records success/failure metrics.
- **`src/app/dashboard/page.tsx`**: UI to interact with or view related data.

## Metrics Overview

The application exposes the following custom metrics:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `capi_request_duration_milliseconds` | Histogram | Latency of CAPI requests | `status`, `event_name` |
| `capi_requests_total` | Counter | Total CAPI requests | `status`, `event_name`, `error_type` |
| `quality_request_duration_milliseconds` | Histogram | Latency of Dataset Quality API | `status` |
| `quality_requests_total` | Counter | Total Dataset Quality API requests | `status`, `error_type` |
| `stats_request_duration_milliseconds` | Histogram | Latency of Stats API | `status` |
| `stats_requests_total` | Counter | Total Stats API requests | `status`, `error_type` |

## Deploy to Vercel

This is a standard Next.js application. You can deploy it easily on [Vercel](https://vercel.com). Ensure the `FB_ACCESS_TOKEN` is set as an environment variable in your deployment.

## Deploy to GCP (VM with PM2 and nginx reverse proxy)


### 1. Log on the VM (ssh) and build from repo:

```bash
ssh <user>@<vm-ip>
git clone git@github.com:lcrespilho/nextjs-prometheus-capi-monitor.git
cd nextjs-prometheus-capi-monitor
npm install
npm run build
```

[Configure .env.local Environment](#2-environment-setup)

### 2. Start using PM2

```bash
pm2 start pm2_ecosystem.config.js
pm2 save
```

### 3. Configure nginx

```bash
# Adjust nginx_capimonitor.conf to your needs (e.g, server_name, ssl_certificate, ssl_certificate_key)
sudo cp nginx_capimonitor.conf /etc/nginx/sites-available/nextjs-prometheus-capi-monitor
sudo ln -s /etc/nginx/sites-available/nextjs-prometheus-capi-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. DNS/SSL Configuration

Adjust your subdomain record on DNS server according to `server_name` on nginx_capimonitor.conf.
Also add the subdomain hostname to your SSL certificate, if it is not a wildcard certificate.

Your application should be accessible at https://nextjsprometheuscapimonitor.louren.co.in


## curl endpoints (just for fun)

```bash
ACCESS_TOKEN="...facebook access token..."

# show token permissions
curl -X GET -G \
  -d access_token=$ACCESS_TOKEN \
  https://graph.facebook.com/v24.0/me/permissions | jq

# show stats api (event count)
curl -X GET -G \
  -d aggregation=event_total_counts \
  -d start_time=$(( $(date +%s) - 24*60*60 )) \
  -d access_token=$ACCESS_TOKEN \
  https://graph.facebook.com/v24.0/587024498387691/stats | jq

# show dataset quality api (CAPI quality)
curl -X GET -G \
  -d dataset_id=587024498387691 \
  -d "fields=web{event_match_quality,event_name}" \
  -d access_token=$ACCESS_TOKEN \
  https://graph.facebook.com/v24.0/dataset_quality | jq
```