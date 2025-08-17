import { XMLParser } from "fast-xml-parser";
import { parse as parseCsv } from "csv-parse/sync";

export type RunMetrics = {
  duration_sec?: number;
  distance_km?: number;
  avg_pace_min_km?: number;
  avg_hr_bpm?: number;
  max_hr_bpm?: number;
  calories?: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  cadence_avg_spm?: number;
  zones_hr?: Record<string, number>; // secondi per zona, se presenti
  laps?: Array<{ distance_km?: number; duration_sec?: number; avg_pace_min_km?: number; avg_hr_bpm?: number }>;
};

function secToPaceMinKm(secondsPerKm?: number): number | undefined {
  if (!secondsPerKm || secondsPerKm <= 0) return undefined;
  return secondsPerKm / 60; // valore decimale (minuti al km)
}

// ---------- TCX ----------
export function parseTcx(buffer: Buffer): RunMetrics {
  const xml = buffer.toString("utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  const data: any = parser.parse(xml);

  // Garmin TCX tipico: TrainingCenterDatabase -> Activities -> Activity -> Lap -> Track -> Trackpoint
  const act = data?.TrainingCenterDatabase?.Activities?.Activity;
  const lapsArr = Array.isArray(act?.Lap) ? act.Lap : act?.Lap ? [act.Lap] : [];

  let totalTime = 0, totalDist = 0, totalHr = 0, hrCount = 0, maxHr = 0, totalCal = 0;
  const laps: RunMetrics["laps"] = [];

  for (const lap of lapsArr) {
    const lapTime = Number(lap?.TotalTimeSeconds ?? 0);
    const lapDist = Number(lap?.DistanceMeters ?? 0) / 1000; // km
    const lapCal = Number(lap?.Calories ?? 0);

    // HR medio lap
    let lapAvgHr = Number(lap?.AverageHeartRateBpm?.Value ?? lap?.AverageHeartRateBpm ?? 0);

    // fallback: media dai trackpoint
    const trackpoints = Array.isArray(lap?.Track?.Trackpoint) ? lap.Track.Trackpoint :
                        lap?.Track?.Trackpoint ? [lap.Track.Trackpoint] : [];
    if (!lapAvgHr && trackpoints.length) {
      let sum = 0, cnt = 0;
      for (const tp of trackpoints) {
        const hr = Number(tp?.HeartRateBpm?.Value ?? tp?.HeartRateBpm ?? 0);
        if (hr) { sum += hr; cnt++; if (hr > maxHr) maxHr = hr; }
      }
      if (cnt) lapAvgHr = sum / cnt;
    }

    totalTime += lapTime;
    totalDist += lapDist;
    totalCal  += lapCal;
    if (lapAvgHr) { totalHr += lapAvgHr; hrCount++; if (lapAvgHr > maxHr) maxHr = lapAvgHr; }

    laps.push({
      distance_km: lapDist || undefined,
      duration_sec: lapTime || undefined,
      avg_pace_min_km: lapDist > 0 ? secToPaceMinKm(lapTime / lapDist) : undefined,
      avg_hr_bpm: lapAvgHr || undefined
    });
  }

  const avgHr = hrCount ? totalHr / hrCount : undefined;
  const avgPace = totalDist > 0 ? secToPaceMinKm(totalTime / totalDist) : undefined;

  return {
    duration_sec: totalTime || undefined,
    distance_km: totalDist || undefined,
    avg_pace_min_km: avgPace,
    avg_hr_bpm: avgHr,
    max_hr_bpm: maxHr || undefined,
    calories: totalCal || undefined,
    laps
  };
}

// ---------- CSV Garmin ----------
export function parseGarminCsv(buffer: Buffer): RunMetrics {
  const text = buffer.toString("utf8");
  const rows = parseCsv(text, { columns: true, skip_empty_lines: true }) as Record<string, any>[];
for (const r of rows);

  // Heuristics: colonne comuni Garmin: "Time", "Distance", "Heart Rate", "Lap", "Cadence", "Elevation", "Calories"
  let totalTime = 0, totalDist = 0, totalHr = 0, hrCount = 0, maxHr = 0, totalCal = 0;
  let elevGain = 0, elevLoss = 0;
  let cadenceSum = 0, cadenceCount = 0;

  // Se il CSV è a campioni (non per lap), sommiamo progressivi
  let prevElev: number | undefined;

  for (const r of rows) {
    const hr = Number(r["Heart Rate"] ?? r["HR"] ?? r["Avg HR"] ?? 0);
    if (hr) { totalHr += hr; hrCount++; if (hr > maxHr) maxHr = hr; }

    const dist = Number(r["Distance"] ?? r["Distance (km)"] ?? r["Distance (m)"] ?? 0);
    // se in metri, converti in km quando > 1000 e la colonna è metrica
    const distKm = r["Distance (m)"] ? dist / 1000 : dist;
    if (!isNaN(distKm)) totalDist = Math.max(totalDist, distKm); // spesso è cumulativo

    const timeSec =
      Number(r["Time (s)"] ?? r["Duration (s)"] ?? 0) ||
      // fallback: se c'è "Time" come HH:MM:SS
      (typeof r["Time"] === "string" && r["Time"].includes(":")
        ? r["Time"].split(":").reduce((acc:number, v:string)=>acc*60+Number(v),0)
        : 0);
    if (!isNaN(timeSec)) totalTime = Math.max(totalTime, timeSec);

    const cal = Number(r["Calories"] ?? r["kcal"] ?? 0);
    if (cal) totalCal = Math.max(totalCal, cal); // cumulativo

    const elev = Number(r["Elevation"] ?? r["Altitude"] ?? 0);
    if (!isNaN(elev)) {
      if (prevElev !== undefined) {
        const diff = elev - prevElev;
        if (diff > 0) elevGain += diff;
        else elevLoss += Math.abs(diff);
      }
      prevElev = elev;
    }

    const cad = Number(r["Cadence"] ?? r["Run Cadence"] ?? 0);
    if (cad) { cadenceSum += cad; cadenceCount++; }
  }

  const avgHr = hrCount ? totalHr / hrCount : undefined;
  const avgPace = totalDist > 0 && totalTime > 0 ? (totalTime / totalDist) / 60 : undefined; // min/km
  const cadenceAvg = cadenceCount ? cadenceSum / cadenceCount : undefined;

  return {
    duration_sec: totalTime || undefined,
    distance_km: totalDist || undefined,
    avg_pace_min_km: avgPace,
    avg_hr_bpm: avgHr,
    max_hr_bpm: maxHr || undefined,
    calories: totalCal || undefined,
    elevation_gain_m: elevGain || undefined,
    elevation_loss_m: elevLoss || undefined,
    cadence_avg_spm: cadenceAvg || undefined
  };
}
