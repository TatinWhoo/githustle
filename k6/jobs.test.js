// k6/jobs.test.js — load test the jobs listing endpoint
// Usage: k6 run --env BASE_URL=http://localhost:4000 --env ACCESS_TOKEN=<token> k6/jobs.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m',  target: 50 },
        { duration: '3m',  target: 50 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<300'],  // Job listing should be fast
        'http_req_failed':   ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
// Set ACCESS_TOKEN env var with a valid token for authenticated tests
const TOKEN = __ENV.ACCESS_TOKEN || '';

export default function () {
    const res = http.get(`${BASE_URL}/api/v1/jobs`, {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    });
    check(res, { 'jobs status 200': (r) => r.status === 200 });
    sleep(0.5);
}
