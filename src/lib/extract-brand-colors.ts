function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image"));
    };
    img.src = url;
  });
}

function sampleColors(file: File, maxSamples = 800): Promise<[number, number, number][]> {
  return loadImage(file).then((img) => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const pixels: [number, number, number][] = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      // Skip near-white and near-black
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;
      pixels.push([r, g, b]);
    }

    if (pixels.length === 0) return [[26, 86, 219]];

    const step = Math.max(1, Math.floor(pixels.length / maxSamples));
    return pixels.filter((_, i) => i % step === 0);
  });
}

function clusterDominant(pixels: [number, number, number][]): [number, number, number] {
  if (pixels.length === 0) return [26, 86, 219];

  let best = pixels[0];
  let bestScore = -1;

  for (const pixel of pixels) {
    const sat = saturation(...pixel);
    const score = sat * 2 + pixel[0] / 255 + pixel[2] / 255;
    if (score > bestScore) {
      bestScore = score;
      best = pixel;
    }
  }

  return best;
}

function findSecondary(
  pixels: [number, number, number][],
  primary: [number, number, number],
): [number, number, number] {
  let best = pixels[0];
  let bestDist = -1;

  for (const pixel of pixels) {
    const dist = colorDistance(pixel, primary);
    const sat = saturation(...pixel);
    const score = dist * sat;
    if (score > bestDist) {
      bestDist = score;
      best = pixel;
    }
  }

  return best;
}

export async function extractBrandColorsFromImage(
  file: File,
): Promise<{ primary: string; secondary: string }> {
  const pixels = await sampleColors(file);
  if (pixels.length === 0) {
    return { primary: "#1A56DB", secondary: "#0E9F6E" };
  }

  const primaryRgb = clusterDominant(pixels);
  const secondaryRgb = findSecondary(pixels, primaryRgb);

  return {
    primary: rgbToHex(...primaryRgb),
    secondary: rgbToHex(...secondaryRgb),
  };
}

export async function extractPrimaryColor(file: File): Promise<string> {
  const { primary } = await extractBrandColorsFromImage(file);
  return primary;
}

export async function extractSecondaryColor(file: File): Promise<string> {
  const pixels = await sampleColors(file);
  if (pixels.length === 0) return "#0E9F6E";
  const primaryRgb = clusterDominant(pixels);
  const secondaryRgb = findSecondary(pixels, primaryRgb);
  return rgbToHex(...secondaryRgb);
}
