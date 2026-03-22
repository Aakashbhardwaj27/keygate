// All API calls are now inlined in App.jsx for self-containment.
// This file is kept for compatibility with any imports.
const BASE_URL = import.meta.env.VITE_API_URL || "";
let authToken = localStorage.getItem("kg_token") || null;
export const setToken   = (t) => { authToken = t; localStorage.setItem("kg_token", t); };
export const clearToken = ()  => { authToken = null; localStorage.removeItem("kg_token"); };
export const getToken   = ()  => authToken;
