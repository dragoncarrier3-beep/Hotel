import type { Config } from "@netlify/functions";
import { processSettlement } from "../../lib/tsb/ledger";

export default async function handler() {
  try {
    const result = await processSettlement("netlify-cron");
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settlement failed";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config: Config = {
  schedule: "0 * * * *",
};
