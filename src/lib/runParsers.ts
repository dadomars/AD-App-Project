// pwa/lib/runParsers.ts
export type RunMetrics = {
  totalDistanceKm?: number;
  totalTimeSec?: number;
  avgHr?: number;
  maxHr?: number;
  elevationGain?: number;
  elevationLoss?: number;
  totalCalories?: number;
  avgCadence?: number;
  samples?: number;
};

// ---------- CSV (Garmin) ----------
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(l => {
    const cols = l.split(","); const row: Record<string,string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? "").replace(/^"|"$/g, "")));
    return row;
  });
}

export function parseGarminCsv(buffer: Buffer): RunMetrics {
  const text = buffer.toString("utf8");
  const rows = parseCsv(text);
  const out: RunMetrics = {};
  let hrSum=0, hrCnt=0, maxHr=0, distMax=0, timeMax=0,
      calMax=0, elevPrev: number|undefined, elevGain=0, elevLoss=0,
      cadSum=0, cadCnt=0;

  for (const r of rows) {
    const hr = Number(r["Heart Rate"] ?? r["HR"] ?? r["Avg HR"]);
    if (!Number.isNaN(hr) && hr>0) { hrSum+=hr; hrCnt++; if (hr>maxHr) maxHr=hr; }

    // distanza: km o metri
    const distKm = Number(r["Distance (km)"] ?? r["Distance km"]) ||
                   (Number(r["Distance (m)"]) / 1000) ||
                   Number(r["Distance"]);
    if (!Number.isNaN(distKm)) distMax = Math.max(distMax, distKm);

    // tempo: sec o "HH:MM:SS"
    let t = Number(r["Time (s)"] ?? r["Duration (s)"]);
    if (Number.isNaN(t)) {
      const tt = r["Time"];
      if (tt && tt.includes(":")) {
        t = tt.split(":").reduce((a,v)=>a*60+Number(v),0);
      }
    }
    if (!Number.isNaN(t)) timeMax = Math.max(timeMax, t);

    const cal = Number(r["Calories"] ?? r["kcal"]);
    if (!Number.isNaN(cal)) calMax = Math.max(calMax, cal);

    const elev = Number(r["Elevation"] ?? r["Altitude"]);
    if (!Number.isNaN(elev)) {
      if (elevPrev!==undefined) {
        const diff = elev - elevPrev;
        if (diff>0) elevGain += diff; else elevLoss += Math.abs(diff);
      }
      elevPrev = elev;
    }

    const cad = Number(r["Cadence"] ?? r["Run Cadence"]);
    if (!Number.isNaN(cad) && cad>0) { cadSum += cad; cadCnt++; }
  }

  out.samples = rows.length || undefined;
  out.totalDistanceKm = distMax || undefined;
  out.totalTimeSec = timeMax || undefined;
  out.avgHr = hrCnt? +(hrSum/hrCnt).toFixed(1) : undefined;
  out.maxHr = maxHr || undefined;
  out.totalCalories = calMax || undefined;
  out.elevationGain = elevGain || undefined;
  out.elevationLoss = elevLoss || undefined;
  out.avgCadence = cadCnt? +(cadSum/cadCnt).toFixed(1) : undefined;

  return out;
}

// ---------- TCX ----------
export function parseTcx(buffer: Buffer): RunMetrics {
  const xml = buffer.toString("utf8");
  const get = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "i"));
    return m?.[1];
  };

  const out: RunMetrics = {};
  const distMeters = Number(get("DistanceMeters") ?? NaN);
  if (!Number.isNaN(distMeters)) out.totalDistanceKm = +(distMeters/1000).toFixed(3);

  const timeSec = Number(get("TotalTimeSeconds") ?? NaN);
  if (!Number.isNaN(timeSec)) out.totalTimeSec = timeSec;

  // HR avg/max (best-effort fra i Trackpoint)
  const hrMatches = [...xml.matchAll(/<HeartRateBpm>.*?<Value>(\d+)<\/Value>/gis)];
  if (hrMatches.length) {
    const vals = hrMatches.map(m=>Number(m[1])).filter(v=>!Number.isNaN(v));
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    out.avgHr = +avg.toFixed(1);
    out.maxHr = Math.max(...vals);
  }

  // calorie (se presenti)
  const cal = Number(get("Calories") ?? NaN);
  if (!Number.isNaN(cal)) out.totalCalories = cal;

  return out;
}
