export function addTimeToNow(time: string): Date {
    const expiresAt = new Date()
  
    const timeValue = parseInt(time.slice(0, -1), 10)
    const timeUnit = time.slice(-1)
  
    switch (timeUnit) {
      case "d":
        expiresAt.setDate(expiresAt.getDate() + timeValue)
        break
      case "h":
        expiresAt.setHours(expiresAt.getHours() + timeValue)
        break
      case "m":
        expiresAt.setMinutes(expiresAt.getMinutes() + timeValue)
        break
      default:
        throw new Error("Invalid time format")
    }
  
    return expiresAt
  }
  /** exp(sec) -> Date */
  export const expToDate = (exp: number) => new Date(exp * 1000);
  
  /** Date -> exp(sec) */
  export const dateToExp = (d: Date) => Math.floor(d.getTime() / 1000);
  
  /** Kiểm tra hết hạn */
  export const isExpired = (exp: number) => Date.now() >= exp * 1000;
  
  /** Còn bao nhiêu ms đến khi hết hạn (âm nếu đã hết hạn) */
  export const msUntilExpiry = (exp: number) => exp * 1000 - Date.now();
  
  /** Format tiện xem (UTC) */
  export const expToIso = (exp: number) => expToDate(exp).toISOString();
  