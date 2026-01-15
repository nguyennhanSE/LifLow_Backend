/**
 * Kiểm tra xem một string có đúng format S3 URL không
 * 
 * Hỗ trợ các format:
 * - https://bucket-name.s3.region.amazonaws.com/key/path (virtual-hosted style với dấu chấm)
 * - https://bucket-name.s3-region.amazonaws.com/key/path (virtual-hosted style với dấu gạch ngang)
 * - https://s3.region.amazonaws.com/bucket-name/key/path (path-style)
 * - https://bucket-name.s3.amazonaws.com/key/path (không có region)
 * 
 * @param url - String cần kiểm tra
 * @returns true nếu đúng format S3 URL, false nếu không
 */
export function isValidS3Url(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);

    // HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    const hostname = urlObj.hostname;

    // Kiểm tra các format S3 URL phổ biến

    // Format 1: https://bucket-name.s3.region.amazonaws.com
    // Ví dụ: https://my-bucket.s3.ap-northeast-2.amazonaws.com
    const virtualHostedStyleWithDot = /^[a-z0-9][a-z0-9.-]*\.s3\.[a-z0-9-]+\.amazonaws\.com$/i;
    if (virtualHostedStyleWithDot.test(hostname)) {
      return true;
    }

    // Format 2: https://bucket-name.s3-region.amazonaws.com
    // Ví dụ: https://my-bucket.s3-ap-northeast-2.amazonaws.com
    const virtualHostedStyleWithDash = /^[a-z0-9][a-z0-9.-]*\.s3-[a-z0-9-]+\.amazonaws\.com$/i;
    if (virtualHostedStyleWithDash.test(hostname)) {
      return true;
    }

    // Format 3: https://bucket-name.s3.amazonaws.com (không có region)
    // Ví dụ: https://my-bucket.s3.amazonaws.com
    const virtualHostedStyleNoRegion = /^[a-z0-9][a-z0-9.-]*\.s3\.amazonaws\.com$/i;
    if (virtualHostedStyleNoRegion.test(hostname)) {
      return true;
    }

    // Format 4: https://s3.region.amazonaws.com/bucket-name (path-style)
    // Ví dụ: https://s3.ap-northeast-2.amazonaws.com/my-bucket
    const pathStyle = /^s3\.[a-z0-9-]+\.amazonaws\.com$/i;
    if (pathStyle.test(hostname) && urlObj.pathname.length > 1) {
      return true;
    }

    // Format 5: https://s3.amazonaws.com/bucket-name (path-style không có region)
    // Ví dụ: https://s3.amazonaws.com/my-bucket
    const pathStyleNoRegion = /^s3\.amazonaws\.com$/i;
    if (pathStyleNoRegion.test(hostname) && urlObj.pathname.length > 1) {
      return true;
    }

    return false;
  } catch {
    // Nếu không parse được URL thì không phải S3 URL hợp lệ
    return false;
  }
}
