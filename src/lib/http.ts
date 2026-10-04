// Thin wrappers over fetch: every request gets a timeout, and a non-2xx answer
// is an error rather than a body to parse.
//
// The native apps are not subject to browser CORS rules, so every upstream is
// requested directly -- the corsproxy.io relay and the dev-server proxy the
// Quasar app needed are gone.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  /** Aborts the request after this many milliseconds. */
  timeoutMs?: number;
  /** Caller cancellation, e.g. the `signal` TanStack Query passes to queryFn. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function abortError(): Error {
  const error = new Error('The request was aborted.');
  error.name = 'AbortError';
  return error;
}

/** One deadline covers both response headers and the entire response body. */
async function request<T>(
  url: string,
  readBody: (response: Response) => Promise<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init } = options;
  if (signal?.aborted) throw abortError();
  const controller = new AbortController();
  let rejectOnAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectOnAbort = () => reject(abortError());
    controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
  });
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);
  const timer = setTimeout(forwardAbort, timeoutMs);
  try {
    const completed = (async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new HttpError(response.status, url);
      return readBody(response);
    })();
    // Some fetch implementations stop forwarding abort once headers arrive.
    // Race the body reader too, so an unresponsive reader cannot hang forever.
    return await Promise.race([completed, aborted]);
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
    controller.signal.removeEventListener('abort', rejectOnAbort);
  }
}

export async function getJson<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return request(url, async (response) => (await response.json()) as T, options);
}

export async function getText(url: string, options?: RequestOptions): Promise<string> {
  return request(url, (response) => response.text(), options);
}
