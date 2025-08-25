function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

describe('Password Policy Validation', () => {
  test('fails if less than 10 characters', () => {
    expect(isValidPassword('Abc$12')).toBe(false);
  });

  test('fails without uppercase letter', () => {
    expect(isValidPassword('password$123')).toBe(false);
  });

  test('fails without special character', () => {
    expect(isValidPassword('Password123')).toBe(false);
  });

  test('passes valid password', () => {
    expect(isValidPassword('Strong$Password1')).toBe(true);
  });
});
