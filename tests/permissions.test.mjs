import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessTab, defaultTab, OPERATION_TABS } from '../src/features/auth/permissions.js'

test('admins can open operations, GTFS, and account management', () => {
  for (const tab of [...OPERATION_TABS, 'gtfs', 'accounts', 'my-account'])
    assert.equal(canAccessTab('admin', tab), true)
})
test('editors can open GTFS and My Account only', () => {
  assert.equal(canAccessTab('editor', 'gtfs'), true)
  assert.equal(canAccessTab('editor', 'my-account'), true)
  assert.equal(defaultTab('editor'), 'gtfs')
  for (const tab of [...OPERATION_TABS, 'accounts'])
    assert.equal(canAccessTab('editor', tab), false)
})
test('operators can open operations and My Account but not restricted tools', () => {
  assert.equal(canAccessTab('operator', 'my-account'), true)
  for (const tab of OPERATION_TABS) assert.equal(canAccessTab('operator', tab), true)
  for (const tab of ['gtfs', 'accounts']) assert.equal(canAccessTab('operator', tab), false)
})
test('unknown roles and routes fail closed', () => {
  for (const role of [null, undefined, '', 'owner']) {
    for (const tab of [...OPERATION_TABS, 'gtfs', 'accounts', 'my-account'])
      assert.equal(canAccessTab(role, tab), false)
  }
  for (const role of ['admin', 'editor', 'operator'])
    assert.equal(canAccessTab(role, 'unknown'), false)
})
