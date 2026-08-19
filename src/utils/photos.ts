import type { ReportAttachment } from '../types/report';

const MAX_IMAGE_SIZE = 1080;
const JPEG_QUALITY = 0.7;
const MAX_ATTACHMENTS = 4;

function makeAttachmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cropToSquare(ctx: CanvasRenderingContext2D, img: HTMLImageElement): ImageData {
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - size) / 2;
  const sy = (img.naturalHeight - size) / 2;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

export async function processImageFile(file: File): Promise<ReportAttachment> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const targetSize = Math.min(longest, MAX_IMAGE_SIZE);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, targetSize, targetSize);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = targetSize;
  croppedCanvas.height = targetSize;
  const croppedCtx = croppedCanvas.getContext('2d')!;
  cropToSquare(croppedCtx, img);

  const resultCanvas = document.createElement('canvas');
  const squareSize = Math.min(MAX_IMAGE_SIZE, Math.max(img.naturalWidth, img.naturalHeight));
  resultCanvas.width = squareSize;
  resultCanvas.height = squareSize;
  const resultCtx = resultCanvas.getContext('2d')!;
  const croppedImg = await loadImage(croppedCanvas.toDataURL('image/jpeg', JPEG_QUALITY));
  resultCtx.drawImage(croppedImg, 0, 0, squareSize, squareSize);

  const outputDataUrl = resultCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = outputDataUrl.split(',')[1];
  const sizeBytes = Math.round(base64.length * 0.75);

  const id = makeAttachmentId();
  return {
    id,
    description: '',
    dataUrl: outputDataUrl,
    fileName: `x-porta-${id}.jpg`,
    width: squareSize,
    height: squareSize,
    sizeBytes,
    driveFileId: null,
    driveUrl: null,
    createdAt: new Date().toISOString(),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function canAddAttachment(currentCount: number): boolean {
  return currentCount < MAX_ATTACHMENTS;
}

export function getMaxAttachments(): number {
  return MAX_ATTACHMENTS;
}
