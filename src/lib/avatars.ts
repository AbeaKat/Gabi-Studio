function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PRESET_AVATARS: string[] = [
  // 1. Coral Ejecutiva
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#FFF1EF"/>
      <circle cx="60" cy="46" r="22" fill="#F26B5B"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#E05343"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  // 2. Azul Zafiro
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#EFF6FF"/>
      <circle cx="60" cy="46" r="22" fill="#2563EB"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#1D4ED8"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  // 3. Esmeralda Imperial
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#ECFDF5"/>
      <circle cx="60" cy="46" r="22" fill="#10B981"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#059669"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  // 4. Violeta Real
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#F5F3FF"/>
      <circle cx="60" cy="46" r="22" fill="#7C3AED"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#6D28D9"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  // 5. Ámbar Dorado
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#FFFBEB"/>
      <circle cx="60" cy="46" r="22" fill="#D97706"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#B45309"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  // 6. Rosa Boutique
  svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#FFF1F2"/>
      <circle cx="60" cy="46" r="22" fill="#E11D48"/>
      <path d="M24 106C24 85.5655 40.1177 69 60 69C79.8823 69 96 85.5655 96 106" fill="#BE123C"/>
      <circle cx="52" cy="44" r="2.8" fill="#FFFFFF"/>
      <circle cx="68" cy="44" r="2.8" fill="#FFFFFF"/>
      <path d="M53 53C55.5 56 64.5 56 67 53" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
];

/**
 * Normalizes any stored avatar URL so broken external DiceBear URLs or cross-origin
 * Supabase Storage URLs resolve cleanly through same-origin or local SVG.
 */
export function resolveAvatarUrl(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  const trimmed = rawUrl.trim();

  // Fix legacy 404 DiceBear URLs
  if (trimmed.includes('api.dicebear.com')) {
    if (trimmed.includes('Executive1')) return PRESET_AVATARS[1];
    if (trimmed.includes('StoreBoss')) return PRESET_AVATARS[3];
    if (trimmed.includes('CommercePro')) return PRESET_AVATARS[2];
    if (trimmed.includes('NicaStore')) return PRESET_AVATARS[4];
    return PRESET_AVATARS[0];
  }

  // Route Supabase Storage public URLs through same-origin Vite bridge to avoid CORS/cookie blocks
  const match = trimmed.match(/https?:\/\/[^/]+\.supabase\.co(\/storage\/v1\/object\/public\/.+)$/);
  if (match && match[1]) {
    return `/supabase-admin${match[1]}`;
  }

  return trimmed;
}

/**
 * Converts a browser File image into a clean, square-cropped 256x256 PNG ArrayBuffer
 * (with fallback to raw file bytes) so any uploaded image renders reliably in all browsers.
 */
export async function normalizeImageFileToPngBuffer(
  file: File
): Promise<{ buffer: ArrayBuffer; contentType: string; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const minSide = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - minSide) / 2;
      const sy = (bitmap.height - minSide) / 2;
      ctx.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, size, size);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 0.92)
      );
      if (blob) {
        return {
          buffer: await blob.arrayBuffer(),
          contentType: 'image/png',
          ext: 'png',
        };
      }
    }
  } catch {
    // Fallback to raw file buffer
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png';
  return {
    buffer: await file.arrayBuffer(),
    contentType: file.type || `image/${safeExt}`,
    ext: safeExt,
  };
}

