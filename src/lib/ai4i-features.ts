export interface AI4IInput {
  airTempK: number;
  processTempK: number;
  rotationalSpeedRpm: number;
  torqueNm: number;
  toolWearMin: number;
  machineType: "L" | "M" | "H";
}

/**
 * Feature order MUST match training:
 * ["air_temp_k", "process_temp_k", "rotational_speed_rpm", "torque_nm", "tool_wear_min",
 *  "Type_L", "Type_M", "temp_diff", "power_w", "torque_x_wear", "rpm_x_wear",
 *  "power_x_wear", "overstrain_score", "heat_diss_flag", "power_oor"]
 */
export function engineerFeatures(input: AI4IInput): Float32Array {
  const {
    airTempK,
    processTempK,
    rotationalSpeedRpm,
    torqueNm,
    toolWearMin,
    machineType,
  } = input;

  const tempDiff = processTempK - airTempK;
  const powerW = torqueNm * rotationalSpeedRpm * ((2 * Math.PI) / 60);
  const torqueXWear = torqueNm * toolWearMin;
  const rpmXWear = rotationalSpeedRpm * toolWearMin;
  const powerXWear = powerW * toolWearMin;
  const overstrainScore = (toolWearMin * torqueNm) / 11000;
  const heatDissFlag =
    tempDiff < 8.6 && rotationalSpeedRpm < 1380 ? 1.0 : 0.0;
  const powerOor = powerW < 3500 || powerW > 9000 ? 1.0 : 0.0;
  const typeL = machineType === "L" ? 1.0 : 0.0;
  const typeM = machineType === "M" ? 1.0 : 0.0;

  return new Float32Array([
    airTempK,        // 0: air_temp_k
    processTempK,    // 1: process_temp_k
    rotationalSpeedRpm, // 2: rotational_speed_rpm
    torqueNm,        // 3: torque_nm
    toolWearMin,     // 4: tool_wear_min
    typeL,           // 5: Type_L
    typeM,           // 6: Type_M
    tempDiff,        // 7: temp_diff
    powerW,          // 8: power_w
    torqueXWear,     // 9: torque_x_wear
    rpmXWear,        // 10: rpm_x_wear
    powerXWear,      // 11: power_x_wear
    overstrainScore, // 12: overstrain_score
    heatDissFlag,    // 13: heat_diss_flag
    powerOor,        // 14: power_oor
  ]);
}
