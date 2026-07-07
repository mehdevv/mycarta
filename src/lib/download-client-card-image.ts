import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { formatCardCode } from "@/lib/card-code";
import { getMilestoneAt, type StampMilestone } from "@/lib/stamp-milestones";

export type CardImageExportData = {
  businessName: string;
  clientName?: string;
  cardCode: string;
  primaryColor?: string;
  secondaryColor?: string;
  qrValue: string;
  cardBgUrl?: string | null;
  logoUrl?: string | null;
  stampsEnabled?: boolean;
  stampThreshold?: number;
  currentStamps?: number;
  milestones?: StampMilestone[];
  progressLabel?: string;
  hint?: string | null;
  footerHint?: string | null;
  filename?: string;
};

const EXPORT_W = 400;
const SCALE = 2;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function svgToCanvas(svg: SVGElement, size: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("QR image failed"));
    };
    img.src = url;
  });
}

async function renderQrCanvas(value: string, size: number): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        createElement(QRCodeSVG, {
          value,
          size,
          level: "M",
          bgColor: "#ffffff",
          fgColor: "#111111",
          marginSize: 1,
        }),
      );
    });

    const svg = host.querySelector("svg");
    if (!svg) throw new Error("QR SVG unavailable");

    return await svgToCanvas(svg, size);
  } finally {
    root.unmount();
    host.remove();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawStampGrid(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    width: number;
    stampThreshold: number;
    currentStamps: number;
    milestones: StampMilestone[];
    primaryColor: string;
  },
) {
  const { x, y, width, stampThreshold, currentStamps, milestones, primaryColor } = opts;
  const cols = Math.min(5, Math.max(1, stampThreshold));
  const rows = Math.ceil(stampThreshold / cols);
  const gap = 10;
  const cell = Math.min(56, (width - gap * (cols - 1)) / cols);
  const gridW = cols * cell + gap * (cols - 1);
  const startX = x + (width - gridW) / 2;

  for (let i = 0; i < stampThreshold; i++) {
    const position = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cell + gap);
    const cy = y + row * (cell + gap);
    const filled = i < currentStamps;
    const prize = getMilestoneAt(milestones, position);
    const isGrand = prize && position === stampThreshold;

    drawRoundedRect(ctx, cx, cy, cell, cell, 12);
    if (filled) {
      ctx.fillStyle = isGrand ? "#7c3aed" : prize ? "#f59e0b" : primaryColor;
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = prize ? (isGrand ? "#c4b5fd" : "#fcd34d") : "#d1d5db";
      ctx.lineWidth = prize ? 2 : 1.5;
      ctx.setLineDash(prize ? [] : [5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (filled) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText("✓", cx + cell / 2, cy + cell / 2);
    } else if (prize) {
      ctx.fillStyle = isGrand ? "#7c3aed" : "#d97706";
      ctx.font = "600 9px system-ui, sans-serif";
      const label = prize.label.length > 8 ? `${prize.label.slice(0, 7)}…` : prize.label;
      ctx.fillText(label, cx + cell / 2, cy + cell / 2 + 6);
      ctx.font = "700 10px system-ui, sans-serif";
      ctx.fillText(isGrand ? "★" : "🎁", cx + cell / 2, cy + cell / 2 - 8);
    } else {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText(String(position), cx + cell / 2, cy + cell / 2);
    }
  }

  return rows * (cell + gap) - gap;
}

async function buildCardExportCanvas(data: CardImageExportData): Promise<HTMLCanvasElement> {
  const primary = data.primaryColor ?? "#1A56DB";
  const secondary = data.secondaryColor ?? "#0E9F6E";
  const stampThreshold = data.stampThreshold ?? 0;
  const currentStamps = data.currentStamps ?? 0;
  const stampsEnabled = data.stampsEnabled !== false && stampThreshold > 0;
  const milestones = data.milestones ?? [];

  const cardW = EXPORT_W - 48;
  const heroH = 196;
  const panelPad = 20;
  let panelContentH = 52;
  if (stampsEnabled) panelContentH += 28;
  if (data.hint) panelContentH += 36;
  if (stampsEnabled) {
    const cols = Math.min(5, Math.max(1, stampThreshold));
    const rows = Math.ceil(stampThreshold / cols);
    panelContentH += rows * 56 + (rows - 1) * 10 + 8;
  }
  if (data.footerHint) panelContentH += 34;

  const cardH = heroH + panelContentH + panelPad * 2;
  const headerH = data.clientName ? 108 : 88;
  const totalH = headerH + 16 + cardH + 32;

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.scale(SCALE, SCALE);

  const bgGrad = ctx.createLinearGradient(0, 0, EXPORT_W, totalH);
  bgGrad.addColorStop(0, `${primary}14`);
  bgGrad.addColorStop(0.5, "#f8fafc");
  bgGrad.addColorStop(1, `${secondary}12`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, EXPORT_W, totalH);

  let y = 24;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#111928";
  ctx.font = "700 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.businessName, EXPORT_W / 2, y);
  y += 28;

  ctx.fillStyle = primary;
  ctx.font = "700 26px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(formatCardCode(data.cardCode), EXPORT_W / 2, y);
  y += 32;

  if (data.clientName) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(data.clientName, EXPORT_W / 2, y);
    y += 22;
  }

  y += 8;
  const cardX = 24;
  const cardY = y;

  ctx.shadowColor = "rgba(15, 23, 42, 0.14)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.clip();

  const bgImg = data.cardBgUrl ? await loadImage(data.cardBgUrl) : null;
  if (bgImg) {
    ctx.drawImage(bgImg, cardX, cardY, cardW, heroH);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(cardX, cardY, cardW, heroH);
  } else {
    const heroGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + heroH);
    heroGrad.addColorStop(0, primary);
    heroGrad.addColorStop(1, secondary);
    ctx.fillStyle = heroGrad;
    ctx.fillRect(cardX, cardY, cardW, heroH);
  }

  const qrSize = 156;
  const qrCanvas = await renderQrCanvas(data.qrValue, qrSize);
  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cardY + 20;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  const panelY = cardY + heroH;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cardX, panelY, cardW, cardH - heroH);

  let py = panelY + panelPad;

  if (stampsEnabled) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(data.progressLabel ?? "Progression", cardX + panelPad, py);
    ctx.textAlign = "right";
    ctx.fillStyle = primary;
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(`${currentStamps}/${stampThreshold}`, cardX + cardW - panelPad, py);
    py += 20;

    const barW = cardW - panelPad * 2;
    const progress = stampThreshold > 0 ? (currentStamps / stampThreshold) * 100 : 0;
    drawRoundedRect(ctx, cardX + panelPad, py, barW, 8, 4);
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
    if (progress > 0) {
      drawRoundedRect(ctx, cardX + panelPad, py, Math.max(8, (barW * progress) / 100), 8, 4);
      ctx.fillStyle = primary;
      ctx.fill();
    }
    py += 20;
  }

  if (data.hint) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#92400e";
    ctx.font = "500 11px system-ui, sans-serif";
    const hintLines = wrapText(ctx, data.hint, cardW - panelPad * 2 - 16);
    drawRoundedRect(ctx, cardX + panelPad, py, cardW - panelPad * 2, hintLines.length * 16 + 12, 10);
    ctx.fillStyle = "#fffbeb";
    ctx.fill();
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.stroke();
    hintLines.forEach((line, i) => {
      ctx.fillStyle = "#92400e";
      ctx.fillText(line, cardX + panelPad + 8, py + 8 + i * 16);
    });
    py += hintLines.length * 16 + 20;
  }

  if (stampsEnabled) {
    const gridH = drawStampGrid(ctx, {
      x: cardX + panelPad,
      y: py,
      width: cardW - panelPad * 2,
      stampThreshold,
      currentStamps,
      milestones,
      primaryColor: primary,
    });
    py += gridH + 12;
  }

  if (data.footerHint) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#9ca3af";
    ctx.font = "500 10px system-ui, sans-serif";
    const footerLines = wrapText(ctx, data.footerHint, cardW - panelPad * 2);
    footerLines.forEach((line, i) => {
      ctx.fillText(line, cardX + cardW / 2, py + i * 14);
    });
  }

  ctx.restore();

  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create image"));
    }, "image/png");
  });
}

async function saveBlobToDevice(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "image/png" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadClientCardImage(data: CardImageExportData): Promise<void> {
  const canvas = await buildCardExportCanvas(data);
  const blob = await canvasToBlob(canvas);
  const safeName = slugify(data.businessName) || "carte";
  const code = formatCardCode(data.cardCode).replace(/\s/g, "");
  await saveBlobToDevice(blob, data.filename ?? `carta-${safeName}-${code}.png`, data.businessName);
}
