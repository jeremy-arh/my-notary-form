import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sequenceStepSend } from "@/inngest/functions/sequence-step";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sequenceStepSend],
});
