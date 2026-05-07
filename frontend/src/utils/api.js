import axios from "axios";

function getApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (window.location.hostname.includes("github.dev")) {
    const domain = window.location.hostname
      .replace(/-5000\./, "-3001.").replace(/-5173\./, "-3001.");
    return `https://${domain}/api`;
  }
  return "/api";
}

const BASE = getApiBase();

export const createPayment     = (d) => axios.post(`${BASE}/payment/create`, d);
export const getPaymentStatus  = (id) => axios.get(`${BASE}/payment/status/${id}`);
export const generateProof     = (d) => axios.post(`${BASE}/proof/generate`, d);
export const releasePayment    = (d) => axios.post(`${BASE}/release`, d);
export const getDemoState      = ()  => axios.get(`${BASE}/demo`);

// SLA oracle endpoints
export const fetchUptimeRobot  = (apiKey, monitorId) =>
  axios.post(`${BASE}/sla/fetch`, { apiKey, monitorId });

export const fetchGitHub       = (d) =>
  axios.post(`${BASE}/sla/github`, d);

export const generateCommitment = (privateValue) =>
  axios.post(`${BASE}/sla/commit`, { privateValue });