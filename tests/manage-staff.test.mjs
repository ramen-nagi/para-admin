import assert from 'node:assert/strict'
import test from 'node:test'
import { createHandler } from '../supabase/functions/manage-staff/handler.js'

test('creating a passenger needs no email configuration and grants no staff access', async () => {
  const f = fixture({ appUrl: '' })
  const response = await f.send({
    action: 'create_user',
    email: ' NEW@example.com ',
    password: 'Test-only-password-123',
    role: 'passenger',
  })
  assert.equal(response.status, 200)
  assert.match((await response.json()).message, /No email/)
  const attributes = f.calls.find((call) => call.name === 'create-user').attributes
  assert.deepEqual(attributes, {
    email: 'new@example.com',
    password: 'Test-only-password-123',
    email_confirm: true,
  })
  assert.equal(
    f.calls.some((call) =>
      ['invite-email', 'reset-email', 'set_managed_user_access'].includes(call.name),
    ),
    false,
  )
})
test('creating staff assigns the role through the guarded caller RPC', async () => {
  for (const role of ['admin', 'editor', 'operator']) {
    const f = fixture({ appUrl: '' })
    assert.equal(
      (
        await f.send({
          action: 'create_user',
          email: 'new@example.com',
          password: 'Test-only-password-123',
          role,
        })
      ).status,
      200,
    )
    assert.deepEqual(f.calls.find((call) => call.name === 'set_managed_user_access').args, {
      p_user_id: 'created-user-id',
      p_role: role,
      p_is_active: true,
    })
  }
})
test('non-admins cannot create any account', async () => {
  for (const role of ['editor', 'operator', '']) {
    const f = fixture({ role })
    assert.equal(
      (
        await f.send({
          action: 'create_user',
          email: 'new@example.com',
          password: 'Test-only-password-123',
          role: 'admin',
        })
      ).status,
      403,
    )
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('invalid create roles and passwords cannot create accounts', async () => {
  for (const changes of [
    { role: 'owner' },
    { password: 'short' },
    { password: 'é'.repeat(40) },
    { password: null },
  ]) {
    const f = fixture()
    const response = await f.send({
      action: 'create_user',
      email: 'new@example.com',
      password: 'Test-only-password-123',
      role: 'passenger',
      ...changes,
    })
    assert.equal(response.status, 400)
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('duplicate create does not reset a password or assign a role', async () => {
  const f = fixture({ createError: { code: 'email_exists' } })
  assert.equal(
    (
      await f.send({
        action: 'create_user',
        email: 'new@example.com',
        password: 'Test-only-password-123',
        role: 'admin',
      })
    ).status,
    409,
  )
  assert.equal(
    f.calls.some((call) => ['set_managed_user_access', 'reset-email'].includes(call.name)),
    false,
  )
})
test('role assignment failure leaves a created passenger and reports partial success', async () => {
  const f = fixture({ accessError: { code: '42501' } })
  const body = await (
    await f.send({
      action: 'create_user',
      email: 'new@example.com',
      password: 'Test-only-password-123',
      role: 'admin',
    })
  ).json()
  assert.equal(body.accessAssigned, false)
  assert.match(body.warning, /Account created as a passenger/)
  assert.equal(JSON.stringify(body).includes('Test-only-password-123'), false)
})

const account = {
  user_id: 'staff-id',
  email: 'staff@example.com',
  is_active: true,
  email_confirmed_at: '2026-09-01',
}
function fixture(overrides = {}) {
  const calls = []
  const userClient = {
    auth: {
      getUser: async () =>
        overrides.invalidToken
          ? { data: null, error: { message: 'Invalid JWT' } }
          : { data: { user: { id: 'admin-id' } }, error: null },
    },
    rpc: async (name, args) => {
      calls.push({ name, args })
      if (name === 'current_staff_role')
        return { data: overrides.role ?? 'admin', error: overrides.roleError }
      if (name === 'list_staff_account_details')
        return { data: overrides.accounts ?? [account], error: null }
      if (name === 'set_staff_access') return { error: overrides.accessError }
      if (name === 'set_managed_user_access') return { error: overrides.accessError }
      throw new Error('Unexpected RPC ' + name)
    },
  }
  const handler = createHandler({
    appUrl: overrides.appUrl === undefined ? 'https://admin.example.com/para/' : overrides.appUrl,
    createUserClient: () => userClient,
    createAdminClient: () => {
      calls.push({ name: 'service-client' })
      return {
        auth: {
          admin: {
            createUser: async (attributes) => {
              calls.push({ name: 'create-user', attributes })
              return { data: { user: { id: 'created-user-id' } }, error: overrides.createError }
            },
            inviteUserByEmail: async (email, options) => {
              calls.push({ name: 'invite-email', email, options })
              return { data: { user: { id: 'new-id' } }, error: overrides.deliveryError }
            },
          },
          resetPasswordForEmail: async (email, options) => {
            calls.push({ name: 'reset-email', email, options })
            return { error: overrides.deliveryError }
          },
        },
      }
    },
  })
  const send = (body, headers = { Authorization: 'Bearer test-token' }) =>
    handler(
      new Request('https://example.com/manage-staff', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
    )
  return { calls, handler, send }
}

test('missing and invalid tokens cannot create a service client', async () => {
  for (const invalidToken of [false, true]) {
    const f = fixture({ invalidToken })
    assert.equal((await f.send({ action: 'invite' }, invalidToken ? undefined : {})).status, 401)
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('editors, operators, and inactive/nonstaff callers cannot send emails', async () => {
  for (const role of ['editor', 'operator', '']) {
    const f = fixture({ role })
    assert.equal(
      (await f.send({ action: 'invite', email: 'new@example.com', role: 'admin' })).status,
      403,
    )
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('failed live role verification fails closed', async () => {
  const f = fixture({ roleError: { message: 'Database unavailable' } })
  assert.equal((await f.send({ action: 'invite' })).status, 503)
  assert.equal(
    f.calls.some((call) => call.name === 'service-client'),
    false,
  )
})
test('an invitation assigns the selected role using the caller RPC', async () => {
  const f = fixture()
  const response = await f.send({
    action: 'invite',
    email: ' NEW@example.com ',
    role: 'editor',
    redirectTo: 'https://evil.example/',
  })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).accessAssigned, true)
  assert.deepEqual(f.calls.find((call) => call.name === 'set_staff_access').args, {
    p_email: 'new@example.com',
    p_role: 'editor',
    p_is_active: true,
  })
  assert.equal(
    f.calls.find((call) => call.name === 'invite-email').options.redirectTo,
    'https://admin.example.com/para/?account=password',
  )
})
test('existing staff cannot be overwritten by an invitation', async () => {
  const f = fixture()
  assert.equal(
    (await f.send({ action: 'invite', email: account.email, role: 'admin' })).status,
    409,
  )
  assert.equal(
    f.calls.some((call) => call.name === 'service-client'),
    false,
  )
})
test('unknown actions, invalid emails, and invalid roles cannot send', async () => {
  for (const body of [
    { action: 'delete', email: account.email },
    { action: 'invite', email: 'invalid', role: 'editor' },
    { action: 'invite', email: 'new@example.com', role: 'owner' },
    null,
  ]) {
    const f = fixture()
    assert.equal((await f.send(body)).status, 400)
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('email failure cannot assign a role', async () => {
  const f = fixture({ deliveryError: { status: 429 } })
  assert.equal(
    (await f.send({ action: 'invite', email: 'new@example.com', role: 'operator' })).status,
    429,
  )
  assert.equal(
    f.calls.some((call) => call.name === 'set_staff_access'),
    false,
  )
})
test('partial invitation success is reported without claiming access was assigned', async () => {
  const f = fixture({ accessError: { code: '42501' } })
  const response = await f.send({ action: 'invite', email: 'new@example.com', role: 'operator' })
  const body = await response.json()
  assert.equal(body.accessAssigned, false)
  assert.match(body.warning, /Manage access/)
})
test('password resets are limited to active staff', async () => {
  for (const accounts of [[], [{ ...account, is_active: false }]]) {
    const f = fixture({ accounts })
    assert.equal((await f.send({ action: 'reset_password', email: account.email })).status, 403)
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
  const f = fixture()
  assert.equal((await f.send({ action: 'reset_password', email: account.email })).status, 200)
  assert.equal(
    f.calls.some((call) => call.name === 'set_staff_access'),
    false,
  )
  assert.equal(f.calls.filter((call) => call.name === 'reset-email').length, 1)
})
test('resending an invitation does not change staff roles', async () => {
  const f = fixture({ accounts: [{ ...account, email_confirmed_at: null }] })
  assert.equal(
    (await f.send({ action: 'resend_invite', email: account.email, role: 'admin' })).status,
    200,
  )
  assert.equal(
    f.calls.some((call) => call.name === 'set_staff_access'),
    false,
  )
  const confirmed = fixture()
  assert.equal(
    (await confirmed.send({ action: 'resend_invite', email: account.email })).status,
    409,
  )
})
test('missing and unsafe redirect configuration prevents sending', async () => {
  for (const appUrl of ['', 'http://unsafe.example.com', 'javascript:alert(1)']) {
    const f = fixture({ appUrl })
    assert.equal((await f.send({ action: 'reset_password', email: account.email })).status, 503)
    assert.equal(
      f.calls.some((call) => call.name === 'service-client'),
      false,
    )
  }
})
test('CORS preflight and unsupported methods have no side effects', async () => {
  const f = fixture()
  assert.equal(
    (await f.handler(new Request('https://example.com', { method: 'OPTIONS' }))).status,
    204,
  )
  assert.equal((await f.handler(new Request('https://example.com'))).status, 405)
  assert.equal(f.calls.length, 0)
})
