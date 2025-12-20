import { createHash } from "crypto"
import bcrypt from "bcrypt"
import { HASH_SALT_LENGTH } from "src/common/constants/index"

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(HASH_SALT_LENGTH)
  const hashedPassword = await bcrypt.hash(password, salt)
  return hashedPassword as string
}
export const comparePassword = (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword)
}
export const hashToken = async (token: string): Promise<string> => {
  const salt = await bcrypt.genSalt(HASH_SALT_LENGTH)
  const hashedToken = await bcrypt.hash(token, salt)
  return hashedToken
}
export const compareToken = (token: string, hashedToken: string) => {
  return bcrypt.compare(token, hashedToken)
}
export const generateDeviceId = (userId: string, userAgent: string) => {
  return createHash("sha256")
    .update(userId + userAgent)
    .digest("hex")
}