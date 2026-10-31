/** Remove an unsafe legacy service-worker cache of authenticated API responses. */
export async function clearLegacySupabaseResponseCache(storage?: Pick<CacheStorage, "delete">): Promise<boolean> {
  const cacheStorage = storage ?? (typeof window !== "undefined" && "caches" in window ? window.caches : undefined);
  if (!cacheStorage) return false;
  try {
    return await cacheStorage.delete("supabase-api");
  } catch {
    // Cache Storage may be unavailable (private browsing / unsupported browser).
    return false;
  }
}
