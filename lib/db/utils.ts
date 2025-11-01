import { generateId } from "ai";
import { genSaltSync, hash, hashSync } from "bcrypt-ts";

export async function generateHashedPassword(password: string) {
  const hashedPassword = await hash(password, 10);
  return hashedPassword;
}

export function generateDummyPassword() {
  const password = generateId();
  const salt = genSaltSync(10);
  const hashedPassword = hashSync(password, salt);

  return hashedPassword;
}
