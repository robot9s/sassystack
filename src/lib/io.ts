import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import type { AppState } from './types';

/** Download a JS object as a pretty-printed JSON file. */
export function downloadJson(state: AppState, filename = 'constellation.json') {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(URL.createObjectURL(blob), filename);
}

/** Read a user-selected JSON file and parse it into AppState. */
export function readJsonFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!parsed || !Array.isArray(parsed.boards)) {
          throw new Error('Invalid Constellation file (missing boards).');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const WATERMARK = 'made with Constellation';

/**
 * Render the React Flow canvas to a PNG, fit to the node bounds, with a small
 * watermark in the bottom-right corner.
 */
export async function exportCanvasPng(
  nodes: Node[],
  filename = 'constellation.png',
  backgroundColor = '#f7f7f8',
) {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl) throw new Error('Canvas not found.');

  const width = 1600;
  const height = 1000;
  const padding = 0.15;

  let transform = { x: 0, y: 0, zoom: 1 };
  if (nodes.length > 0) {
    const bounds = getNodesBounds(nodes);
    const vp = getViewportForBounds(bounds, width, height, 0.4, 2, padding);
    transform = vp;
  }

  const dataUrl = await toPng(viewportEl, {
    backgroundColor,
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    },
  });

  // Composite the watermark onto the captured image.
  const withMark = await addWatermark(dataUrl, width, height);
  triggerDownload(withMark, filename);
}

function addWatermark(dataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pad = 20 * scale;
      ctx.font = `${13 * scale}px ui-sans-serif, system-ui, sans-serif`;
      const textW = ctx.measureText(WATERMARK).width;
      const boxW = textW + 24 * scale;
      const boxH = 30 * scale;
      const x = canvas.width - boxW - pad;
      const y = canvas.height - boxH - pad;

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      roundRect(ctx, x, y, boxW, boxH, 8 * scale);
      ctx.fill();

      ctx.fillStyle = '#d85a30';
      ctx.fillText(WATERMARK, x + 12 * scale, y + boxH / 2 + 5 * scale);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
