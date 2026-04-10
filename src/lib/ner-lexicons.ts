export const EQUIPMENT = [
  "robot", "crane", "conveyor", "forklift", "press", "lathe", "mill",
  "compressor", "pump", "motor", "gearbox", "chiller", "boiler", "turbine",
  "generator", "extruder", "drill", "grinder", "welder", "loader",
  "excavator", "manipulator", "actuator", "servo", "encoder", "plc",
  "hmi", "scada", "inverter", "transformer",
];

export const PARTS = [
  "bearing", "belt", "shaft", "gear", "valve", "seal", "gasket", "bolt",
  "nut", "screw", "bushing", "coupling", "sprocket", "chain", "hose",
  "pipe", "flange", "bracket", "housing", "impeller", "piston", "cylinder",
  "nozzle", "filter", "sensor", "relay", "contactor", "fuse", "switch",
  "cable",
];

export const ACTIONS = [
  "broke", "failed", "cracked", "leaked", "snapped", "bent", "worn",
  "corroded", "overheated", "vibrat", "misalign", "loosen", "ruptured",
  "seized", "strip", "shatter", "melt", "burn", "stuck", "jam",
  "replac", "repair", "inspect", "maintain", "lubricate",
  "tighten",
];

export interface NERResult {
  equipment: string[];
  parts: string[];
  actions: string[];
  quantities: { value: string; unit: string }[];
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.toLowerCase()))];
}

export function extractEntities(text: string): NERResult {
  const equipment: string[] = [];
  const parts: string[] = [];
  const actions: string[] = [];
  const quantities: { value: string; unit: string }[] = [];

  for (const word of EQUIPMENT) {
    const re = new RegExp(`\\b${word}s?\\b`, "gi");
    const matches = text.match(re);
    if (matches) equipment.push(...matches);
  }

  for (const word of PARTS) {
    const re = new RegExp(`\\b${word}s?\\b`, "gi");
    const matches = text.match(re);
    if (matches) parts.push(...matches);
  }

  for (const word of ACTIONS) {
    const re = new RegExp(`\\b${word}\\w*\\b`, "gi");
    const matches = text.match(re);
    if (matches) actions.push(...matches);
  }

  const qtyRe =
    /\b(\d+(?:\.\d+)?)\s*(mm|cm|m|kg|g|bar|psi|rpm|%|kw|hp|v|a|l\/min|mpa)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = qtyRe.exec(text)) !== null) {
    quantities.push({ value: match[1], unit: match[2].toLowerCase() });
  }

  return {
    equipment: dedup(equipment),
    parts: dedup(parts),
    actions: dedup(actions),
    quantities,
  };
}
