const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  meta: () => request('/meta'),
  yards: () => request('/yards'),
  flows: () => request('/flows'),
  trains: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/trains${qs ? `?${qs}` : ''}`);
  },
  train: (id) => request(`/trains/${id}`),
  createTrain: (body) => request('/trains', { method: 'POST', body }),
  patchTrain: (id, body) => request(`/trains/${id}`, { method: 'PATCH', body }),
  trainAction: (id, action, body = {}) => request(`/trains/${id}/actions/${action}`, { method: 'POST', body }),
  deleteTrain: (id) => request(`/trains/${id}`, { method: 'DELETE' }),
  trainWagons: (id) => request(`/trains/${id}/wagons`),
  wagons: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/wagons${qs ? `?${qs}` : ''}`);
  },
  disturbances: () => request('/disturbances'),
  createDisturbance: (body) => request('/disturbances', { method: 'POST', body }),
  deleteDisturbance: (id) => request(`/disturbances/${id}`, { method: 'DELETE' }),
  schedules: () => request('/schedules'),
  chat: (threadId) => request(`/chats/${threadId}`),
  sendChat: (threadId, text) => request(`/chats/${threadId}`, { method: 'POST', body: { text } }),
  translate: (text) => request('/translate', { method: 'POST', body: { text } }),
  kpis: () => request('/kpis'),
};

export function fmtDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Timestamps in this demo are naive local strings, so never use toISOString().
export function nowLocalIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtDelay(minutes) {
  if (minutes === null || minutes === undefined) return '';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
