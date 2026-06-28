import http from 'k6/http'
import { check } from 'k6'
import { Rate } from 'k6/metrics'

const unexpectedErrors = new Rate('unexpected_errors')

const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:8080'
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'test-campaign-id'

export const options = {
  stages: [
    { duration: '10s', target: 200 }, // ramp up to 200 VUs
    { duration: '30s', target: 200 }, // hold at 200 VUs
    { duration: '10s', target: 0   }, // ramp down
  ],
  thresholds: {
    // Any status other than 200/409 counts as unexpected — must stay below 1%
    unexpected_errors: ['rate<0.01'],
    // Network/connection-level failures must also stay below 1%
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const res = http.post(`${BASE_URL}/api/impression/${CAMPAIGN_ID}`)

  if (res.status === 200) {
    // Impression recorded successfully — budget decremented atomically
    check(res, { 'impression recorded (200)': r => r.status === 200 })
    unexpectedErrors.add(false)
  } else if (res.status === 409) {
    // Budget exhausted — expected once all impressions are consumed
    check(res, { 'budget exhausted - ok (409)': r => r.status === 409 })
    unexpectedErrors.add(false)
  } else {
    // Anything else (500, 404, etc.) is a real failure
    console.error(`unexpected status ${res.status} | body: ${res.body}`)
    unexpectedErrors.add(true)
  }
}
