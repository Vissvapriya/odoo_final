import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 200,
  duration: '2m',
};

export default function () {
  const res = http.get('http://localhost:5000/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}