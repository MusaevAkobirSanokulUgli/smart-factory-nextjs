interface SecomParams {
  mask1: boolean[];
  mask2: boolean[];
  imputer_statistics: number[];
  scaler_center: number[];
  scaler_scale: number[];
  selector_support: boolean[];
  ensemble_threshold: number;
  n_features_selected: number;
}

let cachedParams: SecomParams | null = null;

async function loadParams(): Promise<SecomParams> {
  if (cachedParams) return cachedParams;
  const res = await fetch("/models/secom_params.json");
  if (!res.ok) throw new Error(`Failed to load secom_params.json: ${res.status}`);
  cachedParams = (await res.json()) as SecomParams;
  return cachedParams;
}

/**
 * Preprocess raw SECOM sensor input for ONNX model inference.
 * Pipeline: pad/truncate → mask1 → impute → robust scale → mask2 → selector
 */
export async function preprocessSecom(
  sensorValues: number[]
): Promise<Float32Array> {
  const params = await loadParams();

  // Step 1: Pad or truncate to 590
  const raw = new Array<number>(590).fill(NaN);
  for (let i = 0; i < Math.min(sensorValues.length, 590); i++) {
    raw[i] = sensorValues[i];
  }

  // Step 2: Apply mask1 — keep only features where mask1[i] === true
  const afterMask1: number[] = [];
  for (let i = 0; i < 590; i++) {
    if (params.mask1[i]) {
      afterMask1.push(raw[i]);
    }
  }

  // Step 3: Impute NaN with imputer_statistics (medians)
  const imputed = afterMask1.map((v, i) =>
    isNaN(v) ? params.imputer_statistics[i] : v
  );

  // Step 4: RobustScale: (x - center) / scale
  const scaled = imputed.map(
    (v, i) => (v - params.scaler_center[i]) / params.scaler_scale[i]
  );

  // Step 5: Apply mask2
  const afterMask2: number[] = [];
  for (let i = 0; i < scaled.length; i++) {
    if (i < params.mask2.length && params.mask2[i]) {
      afterMask2.push(scaled[i]);
    }
  }

  // Step 6: Apply selector_support
  const selected: number[] = [];
  for (let i = 0; i < afterMask2.length; i++) {
    if (i < params.selector_support.length && params.selector_support[i]) {
      selected.push(afterMask2[i]);
    }
  }

  return new Float32Array(selected);
}

export async function getSecomThreshold(): Promise<number> {
  const params = await loadParams();
  return params.ensemble_threshold;
}

export async function getSecomNFeatures(): Promise<number> {
  const params = await loadParams();
  return params.n_features_selected;
}
