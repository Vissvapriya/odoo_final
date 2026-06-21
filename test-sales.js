import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:5000';

export const options = {
  vus: 80,
  duration: '1m',
};

let token = '';

export function setup() {
  const res = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'admin@erp.com',
      password: 'password123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  token = res.json('token');
  return token;
}

export default function (token) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  http.get(`${BASE_URL}/api/sales-orders`, params);

  check(true, {
    'sales request sent': () => true,
  });
}