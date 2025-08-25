import { hashValue, verifyHash } from '../crypto';

describe('Crypto Utility Functions', () => {
  const plainText = '1234';
  const wrongText = '0000';

  let hashed;

  beforeAll(async () => {
    hashed = await hashValue(plainText);
  });

  test('hashValue returns a string', () => {
    expect(typeof hashed).toBe('string');
    expect(hashed.length).toBeGreaterThan(20); // bcrypt hashes are long
  });

  test('verifyHash returns true for matching value', async () => {
    const result = await verifyHash(plainText, hashed);
    expect(result).toBe(true);
  });

  test('verifyHash returns false for wrong value', async () => {
    const result = await verifyHash(wrongText, hashed);
    expect(result).toBe(false);
  });
});
