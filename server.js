// Exam Navigator — Tutor Proxy (Fase 1.5)
// Guarda a chave da API no servidor (variável de ambiente) e repassa as perguntas do app.
const express = require("express");
const app = express();
app.use(express.json({ limit: "1mb" }));

// Só o seu site pode chamar (CORS)
const ALLOW = ["https://examnavigator.onrender.com", "http://localhost:3000", "http://localhost:8000"];
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (ALLOW.includes(o)) res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-access-code");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_, res) => res.send("Exam Navigator Tutor — OK"));

app.post("/tutor", async (req, res) => {
  try {
    // porta de entrada: o mesmo código de acesso do app (troque junto na rotação mensal)
    if ((req.headers["x-access-code"] || "") !== (process.env.ACCESS_CODE || "CBLE2026"))
      return res.status(401).json({ error: "unauthorized" });

    const { system, messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length)
      return res.status(400).json({ error: "bad request" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.MODEL || "claude-sonnet-4-6",
        max_tokens: 700,
        system: String(system || "").slice(0, 4000),
        messages: messages.slice(-12) // mantém a conversa curta (custo sob controle)
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: "upstream", detail: data });

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: "server" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Tutor proxy no ar"));
