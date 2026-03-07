/**
 * Plausible Analytics - IDENTIQUE à client-dashboard index.html
 */
import Script from "next/script";

const PLAUSIBLE_DOMAIN = "mynotary.io";

export default function PlausibleScripts() {
  return (
    <>
      <Script
        id="plausible-init"
        strategy="beforeInteractive"
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
        strategy="beforeInteractive"
      />
    </>
  );
}
