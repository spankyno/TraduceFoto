/**
 * Utilidades de rate limiting compartidas.
 *
 * IMPORTANTE: MemoryRateLimiter solo vive en la memoria de UN isolate/proceso.
 * En Cloudflare hay muchos isolates simultáneos, así que esto es una red de
 * seguridad "best effort", no un límite real. El límite real debe venir de:
 *   - el binding de Rate Limiting de Workers (si tu despliegue lo soporta), y/o
 *   - una regla WAF "Rate limiting rules" sobre /api/translate-photo.
 */

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export class MemoryRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly maxEntries = 5000
  ) {}

  /** Devuelve true si la petición está permitida (y la registra). */
  check(id: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(id) ?? []).filter((t) => now - t < this.windowMs);

    if (recent.length >= this.max) {
      this.hits.set(id, recent);
      return false;
    }

    recent.push(now);
    // delete + set => la clave pasa al final del Map (orden LRU)
    this.hits.delete(id);
    this.hits.set(id, recent);

    if (this.hits.size > this.maxEntries) this.prune(now);
    return true;
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) {
      if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
    }
    // Si sigue habiendo demasiadas entradas, descarta las más antiguas.
    for (const k of this.hits.keys()) {
      if (this.hits.size <= this.maxEntries) break;
      this.hits.delete(k);
    }
  }
}

/**
 * Hash SHA-256 (hex). Se usa para identificar una API key en el limitador sin
 * guardar la clave ni un fragmento de ella (las claves de Google comparten
 * prefijo, así que recortarlas aumenta las colisiones).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Consulta el binding de Cloudflare si existe; si no existe o falla, cae al
 * limitador en memoria. Devuelve true si la petición está permitida.
 */
export async function checkRateLimit(
  binding: RateLimitBinding | undefined,
  fallback: MemoryRateLimiter,
  key: string
): Promise<boolean> {
  if (binding) {
    try {
      const { success } = await binding.limit({ key });
      return success;
    } catch {
      // Si el binding falla, no dejamos el endpoint sin protección.
    }
  }
  return fallback.check(key);
}
