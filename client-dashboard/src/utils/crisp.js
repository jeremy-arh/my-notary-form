// Crisp chat utility
const CRISP_WEBSITE_ID = "fd0c2560-46ba-4da6-8979-47748ddf247a";

let crispInitialized = false;

/**
 * Initialize Crisp chat widget
 */
export const initCrisp = () => {
  if (crispInitialized) {
    return;
  }

  // Initialize Crisp
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

  // Load Crisp script
  (function() {
    const d = document;
    const s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = 1;
    d.getElementsByTagName("head")[0].appendChild(s);
  })();

  crispInitialized = true;
};

/**
 * Open Crisp chat window
 */
export const openCrisp = () => {
  if (!crispInitialized) {
    initCrisp();
  }
  
  // Wait a bit for Crisp to load, then open
  setTimeout(() => {
    if (window.$crisp && window.$crisp.push) {
      window.$crisp.push(["do", "chat:open"]);
    }
  }, 500);
};

/**
 * Check if Crisp is initialized
 */
export const isCrispInitialized = () => {
  return crispInitialized;
};

