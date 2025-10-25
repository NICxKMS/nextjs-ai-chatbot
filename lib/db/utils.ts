import { generateId } from "ai";
import { hashPassword } from "./crypto-edge";

export async function generateHashedPassword(
  password: string
): Promise<string> {
  return await hashPassword(password);
}

export async function generateDummyPassword(): Promise<string> {
  const password = generateId();
  const hashedPassword = await generateHashedPassword(password);

  return hashedPassword;
}
