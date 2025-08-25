
import bcrypt from 'bcryptjs';

export const hashValue = async (input) => {
  if (!input) return null;
  return await bcrypt.hash(input, 10);
};

export const verifyHash = async (input, hashed) => {
  if (!input || !hashed) return false;
  return await bcrypt.compare(input, hashed);
};
