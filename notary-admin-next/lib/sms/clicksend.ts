/**
 * ClickSend SMS API
 * Envoi de SMS via l'API REST ClickSend
 * @see https://developers.clicksend.com/docs/messaging/sms/other/send-sms
 */

export interface ClickSendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendClickSendSms(
  to: string,
  body: string,
  options?: { from?: string; shortenUrls?: boolean }
): Promise<ClickSendSmsResult> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    return { success: false, error: "ClickSend non configuré (CLICKSEND_USERNAME, CLICKSEND_API_KEY)" };
  }

  const messages: Array<{ body: string; to: string; from?: string }> = [
    { body, to, ...(options?.from && { from: options.from }) },
  ];

  // shorten_urls uniquement si le message contient un lien (ClickSend rejette sinon)
  const hasUrl = /https?:\/\/|\.io\/|\.com\/|\.fr\//i.test(body);
  const shortenUrls = options?.shortenUrls !== undefined ? options.shortenUrls : hasUrl;

  const res = await fetch("https://rest.clicksend.com/v3/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`,
    },
    body: JSON.stringify({
      messages,
      ...(shortenUrls && { shorten_urls: true }),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = data.response_msg || data.message || JSON.stringify(data);
    return { success: false, error: errMsg };
  }

  const firstMessage = data.data?.messages?.[0];
  const messageId = firstMessage?.message_id || null;
  const status = firstMessage?.status;

  if (status !== "SUCCESS" && status !== "QUEUED") {
    return {
      success: false,
      error: firstMessage?.status || data.response_msg || "Échec envoi SMS",
    };
  }

  return { success: true, messageId };
}
