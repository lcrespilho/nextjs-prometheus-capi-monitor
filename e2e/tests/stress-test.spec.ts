import { test, expect } from '@playwright/test'

test('Stress Test in Production', async ({ page }) => {
  test.setTimeout(600_000) // 10 minutes

  await Promise.all([
    page.goto('https://nextjsprometheuscapimonitor.louren.co.in/?fbclid=asdfaskdjfasldkfjasdf'),
    page.waitForResponse(/facebook\.com\/tr.*ev=PageView/),
  ])
  await page.waitForTimeout(2000)

  for (let i = 0; i < 200; i++) {
    const [, pixel, capi] = await Promise.all([
      page.getByRole('button', { name: 'Trigger "Lead" Event (Hybrid)' }).click(),
      page.waitForResponse(/facebook\.com\/tr\/\?id=587024498387691&ev=Lead&/),
      page.waitForResponse('https://nextjsprometheuscapimonitor.louren.co.in/api/capi'),
    ])

    const pixelEventId = new URLSearchParams(pixel.url().split('?')[1]).get('eid')
    const capiEventId = JSON.parse(capi.request().postData() || '{}').event_id

    // Valida que o event_id do CAPI seja igual ao eid do Pixel
    expect(capiEventId).toBe(pixelEventId)

    // Valida que o status da resposta do CAPI seja 200 ou 400 (em caso de erro forçado)
    expect([200, 400]).toContain(capi.status())

    // Valida que o status da resposta do Pixel seja 200 ou 302 (redirects são normais)
    expect([200, 302]).toContain(pixel.status())

    process.stdout.write('.')
  }
})
