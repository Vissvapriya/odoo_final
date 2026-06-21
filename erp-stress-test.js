import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:5000';

export default function () {

  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'admin@erp.com',
      password: 'password123',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  check(loginRes, {
    'login success': (r) => r.status === 200,
  });

  let token = null;

  try {
    token = loginRes.json('token');
  } catch (e) {
    return;
  }

  if (!token) return;

  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // ERP Modules
  http.get(`${BASE_URL}/api/products`, params);
  http.get(`${BASE_URL}/api/vendors`, params);
  http.get(`${BASE_URL}/api/boms`, params);
  http.get(`${BASE_URL}/api/customers`, params);
  http.get(`${BASE_URL}/api/sales-orders`, params);
  http.get(`${BASE_URL}/api/purchase-orders`, params);
  http.get(`${BASE_URL}/api/manufacturing-orders`, params);
  http.get(`${BASE_URL}/api/stock-ledger`, params);
  http.get(`${BASE_URL}/api/users`, params);
  http.get(`${BASE_URL}/api/admin/dashboard`, params);

  sleep(1);
}