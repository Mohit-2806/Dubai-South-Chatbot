import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const magoneUrl = process.env.MAGONE_API_URL;
    const magoneSecret = process.env.MAGONE_SECRET;
    const magoneUseCaseId = process.env.MAGONE_USE_CASE_ID;

    if (!magoneUrl) {
      return res.status(500).json({ error: "MAGONE_API_URL is not configured." });
    }

    let targetUrl = magoneUrl.trim();
    if (!targetUrl.includes("wait=")) {
      targetUrl += targetUrl.includes("?") ? "&wait=true" : "?wait=true";
    }

    const requestBody = {
      use_case_id: magoneUseCaseId,
      input: { message },
    };

    const bodyStr = JSON.stringify(requestBody);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (magoneSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const signature = crypto
        .createHmac("sha256", magoneSecret.trim())
        .update(timestamp + "." + bodyStr)
        .digest("hex");

      headers["X-Signature"] = signature;
      headers["X-Timestamp"] = timestamp;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: bodyStr,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({
        error: `Magone API error: ${response.status} ${errText}`,
      });
    }

    const rawText = await response.text();

    let reply = "";

    try {
      const data = JSON.parse(rawText);

      const target =
        data?.output ?? data?.result ?? data?.data ?? data;

      if (typeof target === "object") {
        reply =
          target.response ||
          target.text ||
          target.reply ||
          target.output ||
          target.message ||
          "";
      }

      if (!reply) {
        reply = data?.reply || data?.text || data?.response || rawText;
      }
    } catch {
      reply = rawText;
    }

    return res.status(200).json({ reply, provider: "magone" });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Server error",
    });
  }
}