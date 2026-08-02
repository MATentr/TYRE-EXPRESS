/**
 * API client for Tyre Express
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const TOKEN_KEY = 'tyre_express_token';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: any = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateLocation: (lat: number, lng: number) =>
    request('/auth/location', { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  toggleOnline: (online: boolean) =>
    request(`/auth/online?online=${online}`, { method: 'PATCH' }),

  nearbyMechanics: (lat: number, lng: number, radius = 25) =>
    request(`/mechanics/nearby?lat=${lat}&lng=${lng}&radius_km=${radius}`),

  createRequest: (body: any) =>
    request('/requests', { method: 'POST', body: JSON.stringify(body) }),
  myRequests: () => request('/requests/my'),
  assignedRequests: () => request('/requests/assigned'),
  getRequest: (id: string) => request(`/requests/${id}`),
  updateRequest: (id: string, status: string) =>
    request(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  reviewRequest: (id: string, rating: number, comment?: string) =>
    request(`/requests/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),

  getSosContacts: () => request('/sos/contacts'),
  addSosContact: (name: string, phone: string) =>
    request('/sos/contacts', { method: 'POST', body: JSON.stringify({ name, phone }) }),
  delSosContact: (id: string) => request(`/sos/contacts/${id}`, { method: 'DELETE' }),
  sosAlert: (lat: number, lng: number) =>
    request('/sos/alert', { method: 'POST', body: JSON.stringify({ lat, lng }) }),

  aiAnalyze: (image_b64: string) =>
    request('/ai/analyze', { method: 'POST', body: JSON.stringify({ image_b64 }) }),

  paymentIntent: (request_id: string, amount_cents: number, method: string) =>
    request('/payments/intent', { method: 'POST', body: JSON.stringify({ request_id, amount_cents, method }) }),
  mockConfirm: (rid: string) => request(`/payments/mock-confirm/${rid}`, { method: 'POST' }),
};
