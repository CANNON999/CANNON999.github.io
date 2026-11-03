export interface ImageProgress { ready: number; settled: number; total: number; }
export async function prepareImages(urls: string[], options: {
  load: (url: string) => Promise<unknown>;
  timeoutMs?: number;
  onProgress?: (progress: ImageProgress) => void;
  /** Also fires if all decodes eventually succeed after the recovery deadline. */
  onAllReady?: () => void;
}) {
  const unique = [...new Set(urls.filter(Boolean))];
  let ready = 0, settled = 0, decoded = 0;
  const failed: string[] = [];
  options.onProgress?.({ ready, settled, total: unique.length });
  if (!unique.length) options.onAllReady?.();
  await Promise.all(unique.map(async url => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve().then(() => options.load(url)).then(() => {
          decoded++;
          if (decoded === unique.length) options.onAllReady?.();
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Image loading timed out')), options.timeoutMs ?? 12000); }),
      ]);
      ready++;
    } catch { failed.push(url); }
    finally {
      clearTimeout(timer);
      settled++;
      options.onProgress?.({ ready, settled, total: unique.length });
    }
  }));
  return { ready, total: unique.length, failed };
}
