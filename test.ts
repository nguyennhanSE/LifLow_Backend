import bcrypt from "bcryptjs"
import { HASH_SALT_LENGTH } from "src/common/constants/index"

const password = bcrypt.hashSync("123456", HASH_SALT_LENGTH)
console.log(password)