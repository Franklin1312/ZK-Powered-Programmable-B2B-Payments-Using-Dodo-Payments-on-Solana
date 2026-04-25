import axios from "axios";

// Construct API base URL dynamically
function getApiBase() {
  // If VITE_API_URL is explicitly set in .env, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For Codespaces: replace port in domain
  if (window.location.hostname.includes('github.dev')) {
    const domain = window.location.hostname.replace(/-5000\./, '-3001.').replace(/-5173\./, '-3001.');
    return `https://${domain}/api`;
  }

  // Default: use relative path, proxied by Vite to localhost:3001
  return "/api";
}

const BASE = getApiBase();

export const createPayment     = (d) => axios.post(`${BASE}/payment/create`, d);
export const getPaymentStatus  = (localId) => axios.get(`${BASE}/payment/status/${localId}`);
export const generateProof     = (d) => axios.post(`${BASE}/proof/generate`, d);
export const releasePayment    = (d) => axios.post(`${BASE}/release`, d);
export const getDemoState      = ()  => axios.get(`${BASE}/demo`);