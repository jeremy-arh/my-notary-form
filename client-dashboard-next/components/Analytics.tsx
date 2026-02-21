"use client";

import Script from "next/script";
import { useEffect } from "react";
import { initGTM } from "@/lib/utils/gtm";

const PLAUSIBLE_DOMAIN = "mynotary.io";
const GTM_ID = "GTM-PSHQGM2J";

export default function Analytics() {
  useEffect(() => {
    initGTM();
  }, []);

  return (
    <>
      {/* Plausible Analytics */}
      <Script
        id="plausible-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.plausible = window.plausible || function() {
              (window.plausible.q = window.plausible.q || []).push(arguments);
            };
          `,
        }}
      />
      <Script
        src="https://plausible.io/js/script.js"
        data-domain={PLAUSIBLE_DOMAIN}
        strategy="afterInteractive"
      />

      {/* Google Tag Manager */}
      <Script
        id="gtm-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
    </>
  );
}
