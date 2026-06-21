import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '1m',
};

export default function () {
  const res = http.post(
    'http://localhost:5000/api/auth/login',
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

  check(res, {
    'login success': (r) => r.status === 200,
  });
}