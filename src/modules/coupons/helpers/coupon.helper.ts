// Get date() of the first date of this month
export function getFirstDateOfThisMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getFirstDateOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Ngày đầu và ngày cuối của tháng hiện tại.
 * VD: today 29/1 → startDate 1/1 00:00:00, endDate 31/1 23:59:59.999
 */
export function getCurrentMonthDateRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1, 0, 0, 0, 0);
  // day 0 = last day of previous month → last day of current month
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * Ngày đầu và ngày cuối của tháng sau (so với today).
 * VD: today 29/1 → startDate 1/2 00:00:00, endDate 28/2 (hoặc 29/2) 23:59:59.999
 */
export function getNextMonthDateRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month + 1, 1, 0, 0, 0, 0);
  // day 0 = last day of previous month → last day of (month+1)
  const endDate = new Date(year, month + 2, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}