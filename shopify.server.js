import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";
import { LATEST_API_VERSION } from "@shopify/shopify-api";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(",") || [
    "read_products",
    "write_products", 
    "read_translations",
    "write_translations",
    "read_content",
    "write_content",
    "read_pages",
    "write_pages",
    "read_blogs",
    "write_blogs",
    "read_articles",
    "write_articles",
    "read_collections",
    "write_collections"
  ],
  appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:3001",
  apiVersion: LATEST_API_VERSION,
  restResources,
  webhooks: {
    "products/create": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/create",
    },
    "products/update": {
      deliveryMethod: "http", 
      callbackUrl: "/webhooks/products/update",
    },
    "products/delete": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/delete", 
    },
    "pages/create": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/pages/create",
    },
    "pages/update": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/pages/update", 
    },
    "pages/delete": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/pages/delete",
    },
    "blogs/create": {
      deliveryMethod: "http", 
      callbackUrl: "/webhooks/blogs/create",
    },
    "blogs/update": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/blogs/update",
    },
    "blogs/delete": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/blogs/delete",
    },
    "articles/create": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/articles/create", 
    },
    "articles/update": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/articles/update",
    },
    "articles/delete": {
      deliveryMethod: "http", 
      callbackUrl: "/webhooks/articles/delete",
    },
    "collections/create": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/collections/create",
    },
    "collections/update": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/collections/update", 
    },
    "collections/delete": {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/collections/delete",
    },
  },
});

export default shopify;
export const authenticate = shopify.authenticate; 