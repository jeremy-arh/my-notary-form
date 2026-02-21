/**
 * Run: node scripts/populate-templates.js
 * Populates automation_steps with existing email HTML and SMS message templates.
 * Replaces JS template variables with {{first_name}} etc.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://jlizwheftlnhoifbqeex.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaXp3aGVmdGxuaG9pZmJxZWV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjE4NCwiZXhwIjoyMDc2NjQyMTg0fQ.GOYUWclz_-uIjZVwuKv0uorHqrItR0DA0A4i5s8NRgQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SHARED_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{subject}}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    table { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .outer-wrapper { padding: 10px 8px !important; }
      .email-container { width: 100% !important; border-radius: 12px !important; }
      .header-cell { padding: 30px 20px 0 20px !important; }
      .content-cell { padding: 40px 20px 30px 20px !important; }
      .footer-cell { padding: 0 20px 25px 20px !important; }
      .cta-button { width: 100% !important; }
      .cta-link { padding: 14px 24px !important; font-size: 14px !important; }
      .body-text { font-size: 16px !important; }
      .logo-img { width: 110px !important; }
    }
  </style>
  <!--[if mso]><style type="text/css">body, table, td { font-family: Arial, sans-serif !important; }</style><![endif]-->
</head>`;

const FONT = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const P_STYLE = `margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: ${FONT};`;
const P_LAST = `margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: ${FONT};`;
const STRONG = `color: #222222; font-weight: 600; font-family: ${FONT};`;

function buildEmail(subject, bodyHtml, ctaText, ctaUrl, footerName) {
  return `${SHARED_HEAD}
<body style="margin: 0; padding: 0; font-family: ${FONT}; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: ${FONT};">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block;">
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: ${FONT};">
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${ctaUrl}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: ${FONT}; line-height: 1.2;">
                            ${ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: ${FONT};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr><td style="border-top: 1px solid #E5E5E5;"></td></tr>
              </table>
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: ${FONT}; line-height: 1.6;">
                Best regards,<br>${footerName}
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: ${FONT};">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const EMAIL_TEMPLATES = {
  "abandoned_cart_h+1": {
    subject: "Your certification is waiting",
    html: buildEmail(
      "Your certification is waiting",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">You started a certification request on <strong style="${STRONG}">mynotary.io</strong> but didn't complete it.</p>
<p class="body-text" style="${P_LAST}">Your documents are ready to be processed — just one step left to receive your certified document.</p>`,
      "Complete my request →",
      "https://app.mynotary.io/form",
      "The My Notary Team"
    ),
  },
  "abandoned_cart_j+1": {
    subject: "A question about your certification?",
    html: buildEmail(
      "A question about your certification?",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">I'm following up as your certification request hasn't been completed yet.</p>
<p class="body-text" style="${P_STYLE}">Perhaps you have a question? Here are the most common ones:</p>
<p class="body-text" style="${P_STYLE}"><strong style="${STRONG}">How long does it take?</strong><br>Your certified document is usually ready within 1 hour.</p>
<p class="body-text" style="${P_STYLE}"><strong style="${STRONG}">Is it officially recognised?</strong><br>Yes, our certifications are valid for administrative, banking, and legal purposes.</p>
<p class="body-text" style="${P_LAST}"><strong style="${STRONG}">Is it 100% online?</strong><br>Absolutely, the entire process is done remotely.</p>`,
      "Complete my request →",
      "https://app.mynotary.io/form",
      "Jeremy<br>Founder, My Notary"
    ),
  },
  "abandoned_cart_j+3": {
    subject: "Last chance for your certification",
    html: buildEmail(
      "Last chance for your certification",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">Your session on My Notary is about to expire.</p>
<p class="body-text" style="${P_LAST}">If you still need to get your documents certified, now is the time to complete your request. After this, you'll need to start the process again from the beginning.</p>`,
      "Complete my certification →",
      "https://app.mynotary.io/form",
      "Jeremy"
    ),
  },
  "abandoned_cart_j+7": {
    subject: "Still need your document certified?",
    html: buildEmail(
      "Still need your document certified?",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">A week ago, you started a certification request on My Notary. I wanted to check in — do you still need your document certified?</p>
<p class="body-text" style="${P_LAST}">The process takes just a few minutes, and your certified document is typically ready within 1 hour — all done 100% online.</p>`,
      "Get my document certified →",
      "https://app.mynotary.io/form",
      "Jeremy<br>Founder, My Notary"
    ),
  },
  "abandoned_cart_j+10": {
    subject: "Why thousands trust My Notary",
    html: buildEmail(
      "Why thousands trust My Notary",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">I noticed you haven't completed your certification yet. I understand — trusting an online service with important documents can feel uncertain.</p>
<p class="body-text" style="${P_STYLE}">Here's what you should know about My Notary:</p>
<p class="body-text" style="${P_STYLE}"><strong style="${STRONG}">✓ Certified notaries</strong><br>We work exclusively with licensed, certified notaries.</p>
<p class="body-text" style="${P_STYLE}"><strong style="${STRONG}">✓ Legally recognised</strong><br>Our certifications are accepted for administrative, banking, and legal purposes.</p>
<p class="body-text" style="${P_LAST}"><strong style="${STRONG}">✓ Secure & confidential</strong><br>Your documents are encrypted and handled with the highest security standards.</p>`,
      "Complete my certification →",
      "https://app.mynotary.io/form",
      "Jeremy<br>Founder, My Notary"
    ),
  },
  "abandoned_cart_j+15": {
    subject: "Can I help you with anything?",
    html: buildEmail(
      "Can I help you with anything?",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">It's been a couple of weeks since you started your certification request. I wanted to reach out personally to see if there's anything I can help with.</p>
<p class="body-text" style="${P_STYLE}">If you encountered any issues during the process, or if our service doesn't quite fit what you need, I'd genuinely appreciate your feedback. It helps us improve.</p>
<p class="body-text" style="${P_LAST}">And if you still need your document certified, I'm here to make sure everything goes smoothly.</p>`,
      "Complete my certification →",
      "https://app.mynotary.io/form",
      "Jeremy<br>Founder, My Notary"
    ),
  },
  "abandoned_cart_j+30": {
    subject: "We're here when you need us",
    html: buildEmail(
      "We're here when you need us",
      `<p class="body-text" style="${P_STYLE}">Hi {{first_name}},</p>
<p class="body-text" style="${P_STYLE}">This will be my last email about your certification request.</p>
<p class="body-text" style="${P_STYLE}">I understand timing isn't always right, or perhaps you found another solution. Either way, no hard feelings.</p>
<p class="body-text" style="${P_LAST}">If you ever need a document certified in the future — whether it's a passport copy, diploma, ID, or any other document — <strong style="${STRONG}">My Notary</strong> will be here. Fast, online, and officially recognised.</p>`,
      "Visit mynotary.io →",
      "https://mynotary.io",
      "Jeremy<br>Founder, My Notary"
    ),
  },
};

const SMS_TEMPLATES = {
  "abandoned_cart_j+1":
    "Hi {{first_name}}, it's Jeremy from My Notary. I saw you didn't finish your certification. If you need any help, reach out at {{support_email}} or continue here: {{form_link}}",
  "abandoned_cart_j+3":
    "{{first_name}}, just checking in. Your certification only takes a couple minutes to complete. If you're stuck, let me know at {{support_email}}. Continue here: {{form_link}}",
  "abandoned_cart_j+10":
    "Hi {{first_name}}, still need your document certified? No rush. If you have any questions, I'm here to help at {{support_email}}. Jeremy from My Notary",
};

async function main() {
  console.log("Fetching automation_steps...");
  const { data: steps, error } = await supabase
    .from("automation_steps")
    .select("id, template_key, channel, sequence_id")
    .order("step_order");

  if (error) {
    console.error("Error fetching steps:", error.message);
    process.exit(1);
  }

  console.log(`Found ${steps.length} steps to populate.`);

  for (const step of steps) {
    const updates = {};

    if (step.channel === "email" && EMAIL_TEMPLATES[step.template_key]) {
      const tpl = EMAIL_TEMPLATES[step.template_key];
      updates.subject = tpl.subject;
      updates.html_body = tpl.html;
      console.log(`  [EMAIL] ${step.template_key} → subject + html_body`);
    } else if (step.channel === "sms" && SMS_TEMPLATES[step.template_key]) {
      updates.message_body = SMS_TEMPLATES[step.template_key];
      console.log(`  [SMS]   ${step.template_key} → message_body`);
    } else {
      console.log(`  [SKIP]  ${step.template_key} (no template found)`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("automation_steps")
      .update(updates)
      .eq("id", step.id);

    if (updateError) {
      console.error(`  ERROR updating ${step.id}:`, updateError.message);
    } else {
      console.log(`  ✓ Updated ${step.id}`);
    }
  }

  console.log("\nDone! All templates populated.");
}

main();
