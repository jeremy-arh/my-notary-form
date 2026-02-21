const CRISP_WEBSITE_ID = "fd0c2560-46ba-4da6-8979-47748ddf247a";

declare global {
  interface Window {
    $crisp?: unknown[][];
    CRISP_WEBSITE_ID?: string;
  }
}

let crispInitialized = false;

export function initCrisp(): void {
  if (typeof window === "undefined") return;
  if (crispInitialized) return;

  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  window.$crisp.push(["do", "chat:hide"]);

  (function () {
    const d = document;
    const s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    d.getElementsByTagName("head")[0]?.appendChild(s);
  })();

  window.$crisp.push([
    "on",
    "chat:closed",
    () => {
      if (window.$crisp?.push) {
        window.$crisp.push(["do", "chat:hide"]);
      }
    },
  ]);

  crispInitialized = true;
}

export function openCrisp(): void {
  if (typeof window === "undefined") return;
  if (!crispInitialized) initCrisp();

  setTimeout(() => {
    if (window.$crisp?.push) {
      window.$crisp.push(["do", "chat:show"]);
      window.$crisp.push(["do", "chat:open"]);
    }
  }, 500);
}
