// k6/auth.test.js
// Usage: k6 run --env BASE_URL=http://localhost:4000 k6/auth.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 VUs
        { duration: '1m',  target: 20 },  // Hold at 20 VUs
        { duration: '10s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'],  // 95th percentile < 500ms
        'http_req_failed':   ['rate<0.01'],  // <1% error rate
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
    // Health check
    const health = http.get(`${BASE_URL}/health`);
    check(health, { 'health ok': (r) => r.status === 200 });

    // Login (rate-limited: 10 req/15min, so use small VU count for auth tests)
    const login = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
    }), { headers: { 'Content-Type': 'application/json' } });

    check(login, {
        'login status 200 or 401': (r) => [200, 401].includes(r.status),
    });

    sleep(1);
}
