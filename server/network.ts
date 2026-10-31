const CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'ETIMEDOUT',
  'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
  'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
]);

// Never log transport messages/URLs/headers: these may contain private values.
export function networkCode(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== 'object' || depth > 5) return undefined;
  if ('code' in error && typeof error.code === 'string' && CODES.has(error.code)) return error.code;
  if ('cause' in error) {
    const code = networkCode(error.cause, depth + 1);
    if (code) return code;
  }
  if (error instanceof AggregateError) {
    for (const child of error.errors.slice(0, 5)) {
      const code = networkCode(child, depth + 1);
      if (code) return code;
    }
  }
  return undefined;
}

export function transientConnection(error: unknown): boolean {
  return ['ECONNRESET', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET']
    .includes(networkCode(error) ?? '');
}

export function transportTimedOut(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== 'object' || depth > 5) return false;
  if ('name' in error && error.name === 'TimeoutError') return true;
  if (['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(networkCode(error) ?? '')) return true;
  return 'cause' in error && transportTimedOut(error.cause, depth + 1);
}
