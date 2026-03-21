/** 提取 URL 的域名部分用于显示 */
export function displayUrl(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
