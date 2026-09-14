import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordValidationError } from '../src/features/auth/passwordPolicy.js'

test('password policy accepts 8+ characters with a letter, number, and special character', () => {
  assert.equal(passwordValidationError('Para123!'), '')
  assert.equal(passwordValidationError('longer-password-2'), '')
})

test('password policy rejects missing requirements and oversized passwords', () => {
  for (const password of ['Para1!', 'abcdefgh!', '12345678!', 'Abcdefg1'])
    assert.notEqual(passwordValidationError(password), '')
  assert.match(passwordValidationError('é'.repeat(40) + 'A1!'), /72 bytes/)
})
