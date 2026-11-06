#!/usr/bin/env node
"use strict";

const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

// Load .env if present
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } else {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && !match[1].startsWith("#")) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (!process.env[key]) process.env[key] = value.trim();
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env file:", e.message);
}

const PORT = Number(process.env.PORT) || 3000;
const GSTIN_API_KEY = (process.env.GSTIN_API_KEY || "").trim();

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, x-api-key");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

async function fetchFromGstinApi(gstin) {
  const clean = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
  const targetUrl = `https://www.gstinapi.in/v1/gstin/${encodeURIComponent(clean)}`;

  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "x-api-key": GSTIN_API_KEY
    }
  });

  const rawJson = await res.json().catch(() => null);

  return {
    status: res.status,
    ok: res.ok,
    json: rawJson
  };
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;

  // Health check endpoint
  if (pathname === "/" || pathname === "/health") {
    return sendJson(res, 200, {
      status: "ok",
      service: "Glass Care Enterprises GSTIN Backend Proxy",
      provider: "GSTIN Portal (gstinapi.in)",
      keyConfigured: Boolean(GSTIN_API_KEY),
      timestamp: new Date().toISOString()
    });
  }

  // GSTIN verification routes:
  // 1. GET /api/gstin?gstin=...
  // 2. GET /v1/gstin/:gstin
  let gstinParam = reqUrl.searchParams.get("gstin") || "";

  const pathMatch = pathname.match(/^\/(?:api\/)?v1\/gstin\/([0-9A-Za-z]{15})$/i) ||
                    pathname.match(/^\/api\/gstin\/([0-9A-Za-z]{15})$/i);
  if (pathMatch) {
    gstinParam = pathMatch[1];
  }

  if (pathname.startsWith("/api/gstin") || pathname.startsWith("/v1/gstin") || reqUrl.searchParams.has("gstin")) {
    const cleanGstin = (gstinParam || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);

    if (cleanGstin.length !== 15) {
      return sendJson(res, 400, {
        success: false,
        error: "INVALID_GSTIN",
        message: "GSTIN must be a 15-character alphanumeric Indian Taxpayer Identification Number."
      });
    }

    if (!GSTIN_API_KEY) {
      return sendJson(res, 500, {
        success: false,
        error: "CONFIG_ERROR",
        message: "Server environment variable GSTIN_API_KEY is not configured."
      });
    }

    try {
      const upstream = await fetchFromGstinApi(cleanGstin);

      if (!upstream.ok) {
        if (upstream.status === 404) {
          return sendJson(res, 404, {
            success: false,
            gstin: cleanGstin,
            error: "NOT_FOUND",
            message: "GSTIN not found in official GST registration database."
          });
        }
        if (upstream.status === 429) {
          return sendJson(res, 429, {
            success: false,
            gstin: cleanGstin,
            error: "RATE_LIMIT",
            message: "Upstream GSTIN API rate limit reached. Please wait a moment before trying again."
          });
        }
        if (upstream.status === 401 || upstream.status === 403) {
          return sendJson(res, 502, {
            success: false,
            gstin: cleanGstin,
            error: "AUTH_FAILURE",
            message: "Upstream GSTIN API key authentication failed."
          });
        }
        return sendJson(res, upstream.status || 502, {
          success: false,
          gstin: cleanGstin,
          error: "UPSTREAM_ERROR",
          message: upstream.json?.message || `Upstream API returned HTTP ${upstream.status}`
        });
      }

      const json = upstream.json;
      if (!json || json.success === false) {
        return sendJson(res, 404, {
          success: false,
          gstin: cleanGstin,
          error: "NOT_FOUND",
          message: json?.message || "GSTIN registration details could not be retrieved."
        });
      }

      const payload = json.data || json.taxpayerInfo || json;

      // Extract properties strictly mapping to user requirements
      const responseGstin = payload.gstin || cleanGstin;
      const legalName = (payload.legal_name || payload.legalName || payload.lgnm || "").trim();
      const tradeName = (payload.trade_name || payload.tradeName || payload.tradeNam || legalName).trim();
      const status = (payload.status || "Active").trim();
      const taxpayerType = (payload.taxpayer_type || payload.taxpayerType || payload.dty || "Regular").trim();
      const registrationDate = payload.registration_date || payload.registrationDate || payload.rgdt || "";
      const rawAddress = payload.address || "";
      const city = payload.city || payload.address_details?.city || payload.address_details?.locality || "";
      const pincode = payload.pincode || payload.address_details?.pincode || "";
      const state = payload.address_details?.state || payload.state || "";

      const normalized = {
        success: true,
        gstin: responseGstin,
        data: {
          gstin: responseGstin,
          legal_name: legalName,
          trade_name: tradeName,
          status: status,
          taxpayer_type: taxpayerType,
          registration_date: registrationDate,
          address: rawAddress,
          city: city,
          pincode: pincode,
          state: state,
          address_details: {
            building_number: payload.address_details?.building_number || "",
            building_name: payload.address_details?.building_name || "",
            floor: payload.address_details?.floor || "",
            street: payload.address_details?.street || "",
            locality: payload.address_details?.locality || "",
            district: payload.address_details?.district || "",
            city: city,
            state: state,
            pincode: pincode
          }
        }
      };

      return sendJson(res, 200, normalized);
    } catch (err) {
      console.error("Proxy error for GSTIN", cleanGstin, err);
      return sendJson(res, 500, {
        success: false,
        gstin: cleanGstin,
        error: "PROXY_ERROR",
        message: "Failed to connect to upstream GST verification service: " + err.message
      });
    }
  }

  // Not found
  return sendJson(res, 404, {
    success: false,
    error: "NOT_FOUND",
    message: "Endpoint not found. Use GET /api/gstin?gstin=<GSTIN>"
  });
});

const { spawn } = require("node:child_process");

let currentPublicUrl = "";

function startTunnel() {
  const binPath = "/home/asfiya/.local/bin/cloudflared";
  if (!fs.existsSync(binPath)) {
    console.log("cloudflared binary not found at", binPath);
    return;
  }
  console.log("Starting Cloudflare HTTPS tunnel for port", PORT, "...");
  const tunnel = spawn(binPath, ["tunnel", "--url", `http://127.0.0.1:${PORT}`]);

  tunnel.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
    if (match) {
      currentPublicUrl = match[0];
      console.log(`\n======================================================`);
      console.log(`LIVE CLOUDFLARE HTTPS BACKEND PROXY ENDPOINT:`);
      console.log(`Base URL:     ${currentPublicUrl}`);
      console.log(`GSTIN API:    ${currentPublicUrl}/api/gstin?gstin=<GSTIN>`);
      console.log(`Health Check: ${currentPublicUrl}/health`);
      console.log(`======================================================\n`);
      try {
        fs.writeFileSync(path.join(__dirname, ".proxy-url"), currentPublicUrl, "utf8");
      } catch (e) {}
    }
  });

  tunnel.on("exit", (code) => {
    console.log(`Cloudflare tunnel process exited (code: ${code}). Reconnecting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });

  process.on("exit", () => {
    try { tunnel.kill(); } catch (e) {}
  });
}

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Glass Care GSTIN Backend Proxy listening on http://0.0.0.0:${PORT}`);
    startTunnel();
  });
}

module.exports = { server, fetchFromGstinApi, getPublicUrl: () => currentPublicUrl };
