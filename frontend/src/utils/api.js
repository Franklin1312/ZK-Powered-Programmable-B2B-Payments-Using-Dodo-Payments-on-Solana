import axios from "axios";
const BASE = "http://localhost:3001/api";

export const createPayment = (data) => axios.post(`${BASE}/payment/create`, data);
export const generateProof = (data) => axios.post(`${BASE}/proof/generate`, data);
export const releasePayment = (data) => axios.post(`${BASE}/release`, data);