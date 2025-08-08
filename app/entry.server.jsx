// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./lib/shopify.js";
import productCreator from "./lib/product-creator.js";
import PrivacyWebhookHandlers from "./lib/privacy.js";
import TranslationWebhookHandlers from "./lib/webhooks.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3001",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/app/dist`
    : `${process.cwd()}/app/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// Combine privacy and translation webhook handlers
const allWebhookHandlers = {
  ...PrivacyWebhookHandlers,
  ...TranslationWebhookHandlers
};

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: allWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in app/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// Helper function to get merchant ID from session
const getMerchantId = (session) => {
  return session.shop || session.shopId || '1'; // Fallback for development
};

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get merchant info
app.get("/api/merchant", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const merchantId = getMerchantId(session);
    
    res.status(200).json({
      merchantId,
      shop: session.shop,
      accessToken: session.accessToken ? '***' : null,
      isOnline: !!session.accessToken
    });
  } catch (error) {
    console.error('Error getting merchant info:', error);
    res.status(500).json({ error: 'Failed to get merchant info' });
  }
});

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// Proxy API calls to backend with merchant context
app.use("/api/translations/*", async (req, res, next) => {
  try {
    const session = res.locals.shopify.session;
    const merchantId = getMerchantId(session);
    
    // Forward to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const backendPath = req.path.replace('/api/translations', '/api/translations');
    
    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': merchantId,
        'X-Shop-Domain': session.shop
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Backend service unavailable' });
  }
});

app.use("/api/settings/*", async (req, res, next) => {
  try {
    const session = res.locals.shopify.session;
    const merchantId = getMerchantId(session);
    
    // Forward to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const backendPath = req.path.replace('/api/settings', '/api/settings');
    
    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': merchantId,
        'X-Shop-Domain': session.shop
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Backend service unavailable' });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => {
  console.log(`🚀 Shopify app server running on port ${PORT}`);
});
