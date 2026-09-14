export const PASSWORD_REQUIREMENTS =
  'Use at least 8 characters, including a letter, number, and special character.'

const specialCharacters = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export function passwordValidationError(password) {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    ![...password].some((character) => specialCharacters.includes(character))
  ) {
    return PASSWORD_REQUIREMENTS
  }

  if (new TextEncoder().encode(password).length > 72) {
    return 'Password must be no more than 72 bytes.'
  }

  return ''
}
