import { test, expect } from '@playwright/test'

const N = 10
const TESTTIMEOUT = 600_000 // 10 minutes

test('Stress Test in Production', async ({ page }) => {
  test.setTimeout(TESTTIMEOUT)

  await page.goto('https://nextjsprometheuscapimonitor.louren.co.in/?fbclid=asdfaskdjfasldkfjasdf')

  for (let i = 0; i < N; i++) {
    const [, pixel, capi] = await Promise.all([
      page.getByRole('button', { name: 'Trigger "Lead" Event (Hybrid)' }).click(),
      page.waitForResponse(/facebook\.com\/tr\/\?id=587024498387691&ev=Lead&/),
      page.waitForResponse(async response => {
        if (response.url().includes('https://nextjsprometheuscapimonitor.louren.co.in/api/capi')) {
          const postData = JSON.parse(response.request().postData() || '{}')
          return postData.event_name === 'Lead'
        } else {
          return false
        }
      }),
    ])

    const pixelEventId = new URLSearchParams(pixel.url().split('?')[1]).get('eid')
    const capiEventId = JSON.parse(capi.request().postData() || '{}').event_id

    // Valida que o event_id do CAPI seja igual ao eid do Pixel
    expect(capiEventId).toBe(pixelEventId)

    // Valida que o status da resposta do CAPI seja 200 ou 400 (em caso de erro forçado)
    expect([200, 400]).toContain(capi.status())

    // Valida que o status da resposta do Pixel seja 200 ou 302 (redirects são normais)
    expect([200, 302]).toContain(pixel.status())

    if (i % 10 === 0) console.log(`Run ${i} of ${N} at ${Math.round(performance.now() / 1000)}s.`)
  }
})
