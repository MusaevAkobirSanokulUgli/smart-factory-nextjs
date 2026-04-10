export interface Detection {
  className: string;
  confidence: number;
  box: [number, number, number, number]; // x1, y1, x2, y2 in original image space
}

export interface LetterboxResult {
  tensor: Float32Array;
  ratio: number;
  padW: number;
  padH: number;
}

const CLASS_NAMES: Record<number, string> = {
  0: "Hardhat",
  1: "NO-Hardhat",
};

const MODEL_SIZE = 640;

export function letterbox(
  imgData: ImageData,
  size: number = MODEL_SIZE
): LetterboxResult {
  const { width: origW, height: origH } = imgData;
  const ratio = size / Math.max(origH, origW);
  const newW = Math.round(origW * ratio);
  const newH = Math.round(origH * ratio);
  const padW = (size - newW) / 2;
  const padH = (size - newH) / 2;

  // Create an OffscreenCanvas (falls back to regular canvas in non-worker contexts)
  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(size, size);
    ctx = (canvas as OffscreenCanvas).getContext("2d");
  } else {
    canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    ctx = (canvas as HTMLCanvasElement).getContext("2d");
  }

  if (!ctx) throw new Error("Could not get 2D context for letterbox");

  // Fill with gray 114
  ctx.fillStyle = `rgb(114,114,114)`;
  ctx.fillRect(0, 0, size, size);

  // Draw the resized source image onto a temp canvas to resize
  let srcCanvas: HTMLCanvasElement;
  let srcCtx: CanvasRenderingContext2D | null;

  srcCanvas = document.createElement("canvas");
  srcCanvas.width = origW;
  srcCanvas.height = origH;
  srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Could not get 2D context for source");
  srcCtx.putImageData(imgData, 0, 0);

  ctx.drawImage(srcCanvas, Math.round(padW), Math.round(padH), newW, newH);

  // Extract pixel data
  const outImageData = ctx.getImageData(0, 0, size, size);
  const pixels = outImageData.data; // RGBA, length = size*size*4

  // Convert to NCHW Float32Array [1,3,H,W] normalized to [0,1]
  const tensor = new Float32Array(1 * 3 * size * size);
  const channelSize = size * size;

  for (let i = 0; i < channelSize; i++) {
    tensor[0 * channelSize + i] = pixels[i * 4 + 0] / 255.0; // R
    tensor[1 * channelSize + i] = pixels[i * 4 + 1] / 255.0; // G
    tensor[2 * channelSize + i] = pixels[i * 4 + 2] / 255.0; // B
  }

  return { tensor, ratio, padW, padH };
}

/**
 * Post-process YOLOv8 output.
 * Output shape: [1, 6, 8400] where dim 1 = [cx, cy, w, h, cls0_score, cls1_score]
 */
export function yoloPostprocess(
  output: Float32Array,
  ratio: number,
  padW: number,
  padH: number,
  origW: number,
  origH: number,
  confThresh: number = 0.05,
  iouThresh: number = 0.45
): Detection[] {
  const numClasses = 2;
  const numAnchors = 8400;
  // output is [1, 6, 8400] flattened → stride over anchors
  // Index: [batch=0, channel, anchor] → channel * numAnchors + anchor

  const results: Detection[] = [];

  // Per-class collections for NMS
  const perClassBoxes: [number, number, number, number][][] = Array.from(
    { length: numClasses },
    () => []
  );
  const perClassScores: number[][] = Array.from(
    { length: numClasses },
    () => []
  );

  for (let a = 0; a < numAnchors; a++) {
    const cx = output[0 * numAnchors + a];
    const cy = output[1 * numAnchors + a];
    const bw = output[2 * numAnchors + a];
    const bh = output[3 * numAnchors + a];

    // Find best class
    let bestClass = 0;
    let bestScore = output[4 * numAnchors + a];
    for (let c = 1; c < numClasses; c++) {
      const score = output[(4 + c) * numAnchors + a];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }

    if (bestScore < confThresh) continue;

    // Convert cx,cy,w,h → x1,y1,x2,y2 in letterboxed space
    const x1lb = cx - bw / 2;
    const y1lb = cy - bh / 2;
    const x2lb = cx + bw / 2;
    const y2lb = cy + bh / 2;

    // Undo letterbox: remove padding, divide by ratio, clamp
    const x1 = Math.max(0, Math.min(origW, (x1lb - padW) / ratio));
    const y1 = Math.max(0, Math.min(origH, (y1lb - padH) / ratio));
    const x2 = Math.max(0, Math.min(origW, (x2lb - padW) / ratio));
    const y2 = Math.max(0, Math.min(origH, (y2lb - padH) / ratio));

    if (x2 <= x1 || y2 <= y1) continue;

    perClassBoxes[bestClass].push([x1, y1, x2, y2]);
    perClassScores[bestClass].push(bestScore);
  }

  // Per-class greedy NMS
  for (let c = 0; c < numClasses; c++) {
    const boxes = perClassBoxes[c];
    const scores = perClassScores[c];
    if (boxes.length === 0) continue;

    const kept = nms(boxes, scores, iouThresh);
    for (const idx of kept) {
      results.push({
        className: CLASS_NAMES[c] ?? `class_${c}`,
        confidence: scores[idx],
        box: boxes[idx],
      });
    }
  }

  return results;
}

export function nms(
  boxes: [number, number, number, number][],
  scores: number[],
  iouThresh: number
): number[] {
  // Sort indices by descending score
  const order = scores
    .map((s, i) => [s, i] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);

  const suppressed = new Set<number>();
  const kept: number[] = [];

  for (const i of order) {
    if (suppressed.has(i)) continue;
    kept.push(i);
    const [x1a, y1a, x2a, y2a] = boxes[i];
    const areaA = (x2a - x1a) * (y2a - y1a);

    for (const j of order) {
      if (suppressed.has(j) || j === i) continue;
      const [x1b, y1b, x2b, y2b] = boxes[j];
      const interX1 = Math.max(x1a, x1b);
      const interY1 = Math.max(y1a, y1b);
      const interX2 = Math.min(x2a, x2b);
      const interY2 = Math.min(y2a, y2b);

      const interW = Math.max(0, interX2 - interX1);
      const interH = Math.max(0, interY2 - interY1);
      const interArea = interW * interH;

      const areaB = (x2b - x1b) * (y2b - y1b);
      const iou = interArea / (areaA + areaB - interArea + 1e-6);

      if (iou > iouThresh) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}
