import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";

// Load standard .env file if it exists
dotenv.config();

// Fallback to loading .env.example if .env does not exist or to supplement missing keys
if (fs.existsSync(".env.example")) {
  try {
    const envExampleContent = fs.readFileSync(".env.example", "utf-8");
    const envExampleConfig = dotenv.parse(envExampleContent);
    for (const key in envExampleConfig) {
      if (!process.env[key] || process.env[key].startsWith("MY_") || process.env[key] === "") {
        process.env[key] = envExampleConfig[key];
        console.log(`Loaded fallback env var [${key}] from .env.example`);
      }
    }
  } catch (err) {
    console.error("Failed to parse .env.example fallback:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for chatbot communication
  app.post("/api/chat", async (req, res) => {
    try {
      const { message} = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const magoneUrl = process.env.MAGONE_API_URL;
  
      const magoneSecret = process.env.MAGONE_SECRET;
      const magoneUseCaseId = process.env.MAGONE_USE_CASE_ID;

      // If Magone AI URL is configured, use it
      if (magoneUrl && magoneUrl.trim() !== "") {
        let targetUrl = magoneUrl.trim();
        
        // Ensure synchronous execution so we receive the response immediately
        if (!targetUrl.includes("wait=")) {
          targetUrl += targetUrl.includes("?") ? "&wait=true" : "?wait=true";
        }
        
        console.log(`Calling Magone API with wait=true at: ${targetUrl}`);

        // Construct the official request body payload
        const requestBody = {
          use_case_id: magoneUseCaseId,
          input: {
            message: message
          }
        };
        const bodyStr = JSON.stringify(requestBody);

        // Generate HMAC SHA256 Signature if a secret key is provided
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        if (magoneSecret && magoneSecret.trim() !== "") {
            const signature = crypto
                .createHmac("sha256", magoneSecret.trim())
                .update(timestamp + "." + bodyStr)
                .digest("hex");

            headers["X-Signature"] = signature;
            headers["X-Timestamp"] = timestamp;
        }

        console.log(`Sending signed request. Timestamp: ${timestamp}`);

        const response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: bodyStr
        });

        console.log(`Magone Hook Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`Magone API Hook returned error status ${response.status}: ${errorText || "Unknown error"}`);
        }

        const rawText = await response.text();
        console.log("Magone raw response text:", rawText);

        let reply = "";
        try {
          const data = JSON.parse(rawText);
          
          // Robustly resolve nested chatbot output fields
          if (data && typeof data === "object") {
            const target = data.output !== undefined ? data.output : (data.result !== undefined ? data.result : (data.data !== undefined ? data.data : data));
            
            if (target && typeof target === "object") {
              reply = target.response || 
                      target.text || 
                      target.reply || 
                      target.output || 
                      target.content || 
                      target.message || 
                      "";
            }
            
            if (!reply) {
              reply = data.reply || 
                      data.text || 
                      data.response || 
                      data.output || 
                      data.content || 
                      data.message || 
                      "";
            }
            
            if (!reply && typeof data.output === "string") {
              reply = data.output;
            }
            
            if (!reply) {
              reply = JSON.stringify(data);
            }
          } else {
            reply = String(data);
          }
        } catch (jsonErr) {
          reply = rawText.trim();
        }

        return res.json({ reply, provider: "magone" });
        }

        return res.status(500).json({
          error: "MAGONE_API_URL is not configured."
        });

        } catch (error: any) {
          console.error("Chat API Error:", error);
          return res.status(500).json({
            error: error.message || "An error occurred while communicating with the AI Assistant."
          });
        }

    });

  // Setup Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
