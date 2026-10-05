const SUPABASE_PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";
const SUPABASE_PUBLIC_RENDER_PREFIX = "/storage/v1/render/image/public/";

type ImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
};

export function getOptimizedImageUrl(
  src: string | null | undefined,
  options: ImageOptions = {}
): string {
  if (!src) return "";

  const { width = 800, height, quality = 70 } = options;

  try {
    const url = new URL(src);
    const markerIndex = url.pathname.indexOf(
      SUPABASE_PUBLIC_OBJECT_PREFIX
    );

    if (markerIndex === -1) return src;

    const storagePath = url.pathname.slice(
      markerIndex + SUPABASE_PUBLIC_OBJECT_PREFIX.length
    );

    if (!storagePath) return src;

    const renderPath =
      SUPABASE_PUBLIC_RENDER_PREFIX + storagePath;

    url.pathname = renderPath;
    url.search = "";
    url.searchParams.set("width", String(width));
    if (height) {
      url.searchParams.set("height", String(height));
    }
    url.searchParams.set("quality", String(quality));

    return url.toString();
  } catch {
    return src;
  }
}
