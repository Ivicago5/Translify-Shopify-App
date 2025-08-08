import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

const API_BASE = '/api';

async function getAuthHeaders(app) {
  let headers = { 'Content-Type': 'application/json' };

  // Only try to get session token if we have an app instance
  if (app && process.env.NODE_ENV !== 'development') {
    try {
      const sessionToken = await getSessionToken(app);
      headers['Authorization'] = `Bearer ${sessionToken}`;
    } catch (error) {
      console.error('Failed to get session token:', error);
    }
  }

  // Add merchant ID for development
  if (process.env.NODE_ENV === 'development') {
    headers['X-Merchant-ID'] = '1';
  }

  return headers;
}

export function useApi() {
  // In development mode, don't use App Bridge
  const app = process.env.NODE_ENV === 'development' ? null : useAppBridge();

  const api = {
    get: async (path, options = {}) => {
      const headers = await getAuthHeaders(app);
      const res = await fetch(`${API_BASE}${path}`, { 
        headers,
        ...options
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    post: async (path, data) => {
      const headers = await getAuthHeaders(app);
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: data instanceof FormData ? 
          { 'Authorization': headers['Authorization'] } : 
          headers,
        body: data instanceof FormData ? data : JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    put: async (path, data) => {
      const headers = await getAuthHeaders(app);
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },

    delete: async (path) => {
      const headers = await getAuthHeaders(app);
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  };

  return api;
} 