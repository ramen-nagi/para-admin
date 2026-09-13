import assert from 'node:assert/strict'

const endpoint = 'https://pjkwfayeslzbafawkies.supabase.co/functions/v1/manage-staff'
for (const [method, headers, expected] of [
  ['OPTIONS', {}, 204],
  ['GET', {}, 405],
  ['POST', {}, 401],
  ['POST', { Authorization: 'Bearer invalid-test-token' }, 401],
]) {
  const response = await fetch(endpoint, {
    method,
    headers,
    signal: AbortSignal.timeout(15000),
    ...(method === 'POST' ? { body: '{}' } : {}),
  })
  assert.equal(response.status, expected, method + ' returned an unexpected status')
  if (method === 'POST') {
    const body = await response.json()
    assert.equal(typeof body.error, 'string')
  }
  console.log(method + ': expected HTTP ' + expected)
}
console.log('Deployed endpoint rejects unauthenticated requests; no account emails sent.')
