export async function checkUrlReachable(url: string): Promise<{ reachable: boolean; statusCode?: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    return { reachable: response.ok, statusCode: response.status };
  } catch {
    return { reachable: false };
  }
}
