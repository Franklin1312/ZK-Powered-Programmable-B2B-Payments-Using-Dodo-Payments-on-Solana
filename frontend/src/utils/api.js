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

  // For Replit: backend runs on localhost:3001, frontend proxied on port 5000
  return "http://localhost:3001/api";
}

const BASE = getApiBase();

export const createPayment  = (d) => axios.post(`${BASE}/payment/create`, d);
export const generateProof  = (d) => axios.post(`${BASE}/proof/generate`, d);
export const releasePayment = (d) => axios.post(`${BASE}/release`, d);