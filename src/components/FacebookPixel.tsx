'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'

export default function FacebookPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Manual PageView firing to support deduplication with CAPI
    if (window.fbq) {
      // Generate a unique event ID for deduplication
      const eventId = crypto.randomUUID()

      // Fire Pixel Event
      window.fbq('trackSingle', process.env.NEXT_PUBLIC_FB_PIXEL_ID, 'PageView', {}, { eventID: eventId })

      // Fire CAPI Event (Server-side)
      fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'PageView',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: window.location.href,
          user_data: {
            // For PageView we usually don't have user info yet, but the server will pick up IP/User Agent/Cookies
          }
        }),
      }).catch(err => console.error('Failed to send PageView CAPI:', err))
    }
  }, [pathname, searchParams])

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            
            // Disable automatic PageView tracking to prevent double firing
            fbq.disablePushState = true;
            
            fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
          `,
        }}
      />
    </>
  )
}
