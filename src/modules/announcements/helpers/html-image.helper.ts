/**
 * Helper functions for processing HTML content with base64 images
 */

export interface Base64Image {
  dataUrl: string;
  mimeType: string;
  base64Data: string;
}

/**
 * Extract all base64 data URLs from HTML content
 */
export function extractBase64Images(html: string): Base64Image[] {
  const images: Base64Image[] = [];
  
  // Match data URLs in img src attributes
  // Pattern: data:image/[type];base64,[data]
  const dataUrlRegex = /data:(image\/(?:jpeg|jpg|png|gif|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)/g;
  
  let match;
  while ((match = dataUrlRegex.exec(html)) !== null) {
    images.push({
      dataUrl: match[0],
      mimeType: match[1],
      base64Data: match[2],
    });
  }
  
  return images;
}

/**
 * Replace base64 data URLs in HTML with S3 URLs
 */
export function replaceBase64WithUrls(
  html: string,
  replacements: Map<string, string>,
): string {
  let result = html;
  
  replacements.forEach((url, dataUrl) => {
    // Replace all occurrences of this data URL
    result = result.replace(new RegExp(escapeRegExp(dataUrl), 'g'), url);
  });
  
  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
