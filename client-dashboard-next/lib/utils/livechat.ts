const LIVECHAT_LICENSE = 19504327;

declare global {
  interface Window {
    __lc?: { license: number; integration_name?: string; product_name?: string; asyncInit?: boolean };
    LiveChatWidget?: {
      call: (method: string, ...args: unknown[]) => void;
      get: (method: string) => unknown;
      on: (method: string, callback: () => void) => void;
    };
  }
}

let livechatInitialized = false;
let hideListenersSetup = false;

const LIVECHAT_SCRIPT = `(function(n,t,c){function i(n){return e._h?e._h.apply(null,n):e._q.push(n)}var e={_q:[],_h:null,_v:"2.0",on:function(){i(["on",c.call(arguments)])},once:function(){i(["once",c.call(arguments)])},off:function(){i(["off",c.call(arguments)])},get:function(){if(!e._h)throw new Error("[LiveChatWidget] You can't use getters before load.");return i(["get",c.call(arguments)])},call:function(){i(["call",c.call(arguments)])},init:function(){var n=t.createElement("script");n.async=!0,n.type="text/javascript",n.src="https://cdn.livechatinc.com/tracking.js",t.head.appendChild(n)}};!n.__lc.asyncInit&&e.init(),n.LiveChatWidget=n.LiveChatWidget||e}(window,document,[].slice));`;

function hideLiveChatBubble(): void {
  if (window.LiveChatWidget?.call) {
    window.LiveChatWidget.call("hide");
  }
}

export function initLiveChat(): void {
  if (typeof window === "undefined") return;
  if (livechatInitialized) return;

  window.__lc = window.__lc ?? { license: LIVECHAT_LICENSE };
  window.__lc.license = LIVECHAT_LICENSE;
  window.__lc.integration_name = "manual_onboarding";
  window.__lc.product_name = "livechat";

  const script = document.createElement("script");
  script.textContent = LIVECHAT_SCRIPT;
  document.head.appendChild(script);

  // Masquer la bulle dès que le widget est prêt, et quand l'utilisateur ferme le chat
  const setupHideListeners = () => {
    if (hideListenersSetup || !window.LiveChatWidget?.on) return;
    hideListenersSetup = true;
    window.LiveChatWidget.on("ready", hideLiveChatBubble);
    window.LiveChatWidget.on("visibility_changed", () => {
      hideLiveChatBubble();
    });
    hideLiveChatBubble();
  };

  // Le widget peut charger avec un délai
  [100, 500, 1500].forEach((ms) => setTimeout(setupHideListeners, ms));

  livechatInitialized = true;
}

export function openLiveChat(): void {
  if (typeof window === "undefined") return;
  if (!livechatInitialized) initLiveChat();

  const open = () => {
    if (window.LiveChatWidget?.call) {
      window.LiveChatWidget.call("maximize");
    }
  };

  if (window.LiveChatWidget?.call) {
    open();
  } else {
    setTimeout(open, 500);
  }
}
