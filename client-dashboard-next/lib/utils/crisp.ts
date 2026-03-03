/**
 * Crisp chat utility - remplace LiveChat pour le support client
 */

const CRISP_WEBSITE_ID =
  process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || "fd0c2560-46ba-4da6-8979-47748ddf247a";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

let crispInitialized = false;

export function initCrisp(): void {
  if (typeof window === "undefined") return;
  if (crispInitialized) return;

  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

  // Masquer la bulle par défaut (affichée au clic sur Contact Us)
  window.$crisp.push(["do", "chat:hide"]);

  // Charger le script Crisp
  const script = document.createElement("script");
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  document.head.appendChild(script);

  // Masquer la bulle quand l'utilisateur ferme le chat
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

  const open = () => {
    if (window.$crisp?.push) {
      window.$crisp.push(["do", "chat:show"]);
      window.$crisp.push(["do", "chat:open"]);
    }
  };

  // Le script Crisp peut charger avec un délai
  open();
  setTimeout(open, 300);
  setTimeout(open, 800);
}
