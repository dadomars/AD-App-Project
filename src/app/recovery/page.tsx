"use client";
import { useMemo, useState, useEffect} from "react";
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// --- helper numerici + tipi ----------------------------------
type TrainingStatus =
  | "Productive" | "Maintaining" | "Peaking"
  | "Unproductive" | "Overreaching" | "Detraining" | "Recovery";

// normalizza un input HTML "number" → intero nel range, oppure null se vuoto
function toInt(v: any, lo: number, hi: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return Math.max(lo, Math.min(hi, i));
}

function dropNulls<T extends object>(obj: T): any {
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const sub = dropNulls(v as any);
      if (Object.keys(sub).length) out[k] = sub;
    } else {
      out[k] = v;
    }
  }
  return out;
}
export const AREAS = [
  "Collo",
  "Spalla",
  "Braccio",
  "Gomito",
  "Avambraccio",
  "Polso/Mano",
  "Dorsale",
  "Lombare",
  "Anca",
  "Gluteo",
  "Coscia anteriore (quadricipite)",
  "Coscia posteriore (ischiocrurali)",
  "Ginocchio",
  "Polpaccio",
  "Caviglia",
  "Piede"
] as const;
export const SYMPTOMS_BY_AREA: Record<(typeof AREAS)[number], string[]> = {
  Collo: ["Rigidità", "Dolore", "Cefalea cervicogenica", "Formicolio/braccio"],
  Spalla: ["Dolore", "Click/Scatto", "Instabilità", "Rigidità"],
  Braccio: ["Dolore diffuso", "Formicolio"],
  Gomito: ["Dolore laterale", "Dolore mediale", "Rigidità"],
  Avambraccio: ["Tensione", "Dolore", "Formicolio"],
  "Polso/Mano": ["Dolore", "Formicolio", "Debolezza presa"],
  Dorsale: ["Rigidità", "Dolore", "Punti trigger"],
  Lombare: ["Dolore", "Irradiazione gamba", "Rigidità mattutina"],
  Anca: ["Dolore inguinale", "Click/Scatto", "Rigidità"],
  Gluteo: ["Dolore profondo", "Trigger point", "Sciatalgia‑like"],
  "Coscia anteriore (quadricipite)": ["Dolore", "Tensione", "DOMS"],
  "Coscia posteriore (ischiocrurali)": ["Dolore", "Tensione", "Strappo sospetto", "DOMS"],
  Ginocchio: ["Dolore anteriore", "Dolore mediale", "Dolore laterale", "Instabilità", "Rigidità"],
  Polpaccio: ["Tensione", "Crampi", "DOMS", "Strappo sospetto"],
  Caviglia: ["Dolore", "Instabilità", "Gonfiore"],
  Piede: ["Fascite plantare", "Dolore avampiede", "Tallonite"]
};

export const SUBTYPES_BY_PAIR: Record<string, string[]> = {
  // Collo
  "Collo|Rigidità": ["Movimenti limitati", "Mattutina", "Posturale"],
  "Collo|Dolore": ["Unilaterale", "Bilaterale", "Con irradiazione"],
  "Collo|Cefalea cervicogenica": ["Occipitale", "Frontale"],
  "Collo|Formicolio/braccio": ["C6‑C7", "C5‑C6", "Non chiaro"],

  // Spalla
  "Spalla|Dolore": ["Sovraspinato", "Tendine bicipite", "Cuffia non specifico"],
  "Spalla|Click/Scatto": ["Sovraspinato", "Borsa subacromiale", "Scapolo‑toracico"],
  "Spalla|Instabilità": ["Anteriore", "Posteriore", "Multidirezionale"],
  "Spalla|Rigidità": ["Capsulite sospetta", "Post‑training"],

  // Anca
  "Anca|Dolore inguinale": ["Adduttori", "Ileo‑psoas", "Articolare"],
  "Anca|Click/Scatto": ["Interno (psoas)", "Esterno (bender)", "Intra‑articolare"],
  "Anca|Rigidità": ["Rotazioni limitate", "Flesso‑addotto"],

  // Gluteo
  "Gluteo|Dolore profondo": ["Medio gluteo", "Grande gluteo", "Piriforme"],
  "Gluteo|Trigger point": ["Medio gluteo", "Quadrato femorale"],
  "Gluteo|Sciatalgia‑like": ["Piriforme", "Muscolare"],

  // Coscia anteriore
  "Coscia anteriore (quadricipite)|Dolore": ["Rett femorale", "Vasto laterale", "Vasto mediale"],
  "Coscia anteriore (quadricipite)|Tensione": ["Rett femorale", "Diffusa"],
  "Coscia anteriore (quadricipite)|DOMS": ["Diffusa", "Rett femorale"],

  // Coscia posteriore
  "Coscia posteriore (ischiocrurali)|Dolore": ["Bicipite femorale", "Semitendinoso", "Semimembranoso"],
  "Coscia posteriore (ischiocrurali)|Tensione": ["Prossimale", "Distale", "Diffusa"],
  "Coscia posteriore (ischiocrurali)|Strappo sospetto": ["Prossimale", "Intra‑muscolare", "Distale"],
  "Coscia posteriore (ischiocrurali)|DOMS": ["Diffusa"],

  // Ginocchio
  "Ginocchio|Dolore anteriore": ["Rotuleo", "Tendine quadricipitale", "Femororotuleo"],
  "Ginocchio|Dolore mediale": ["Legamento collaterale", "Menisco mediale"],
  "Ginocchio|Dolore laterale": ["Banda ileotibiale", "Menisco laterale"],
  "Ginocchio|Instabilità": ["LCA", "LCP", "Senza trauma"],
  "Ginocchio|Rigidità": ["Post‑carico", "Mattutina"],

  // Polpaccio
  "Polpaccio|Tensione": ["Gastrocnemio mediale", "Gastrocnemio laterale", "Soleo"],
  "Polpaccio|Crampi": ["Notturni", "Durante sforzo"],
  "Polpaccio|DOMS": ["Diffusi"],
  "Polpaccio|Strappo sospetto": ["Mediale", "Laterale", "Soleo"],

  // Caviglia
  "Caviglia|Dolore": ["Laterale", "Mediale", "Anteriore"],
  "Caviglia|Instabilità": ["Esiti distorsione", "Meccanica"],
  "Caviglia|Gonfiore": ["Laterale", "Diffuso"],

  // Piede
  "Piede|Fascite plantare": ["Sede calcaneare", "Mediale"],
  "Piede|Dolore avampiede": ["Metatarsalgia", "Sesamoidi"],
  "Piede|Tallonite": ["Borsa retrocalcaneare", "Tendineo"]
};
export default function RecoveryPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [athleteId] = useState("davide");
  const [doms, setDoms] = useState<number | null>(null);            // 0..10 step 0.5
  const [sleepH, setSleepH] = useState<number | null>(null);        // 0..12
  const [sleepM, setSleepM] = useState<number | null>(null);        // 0, 15, 30, 45
  const [pains, setPains] = useState("");
  const [notes, setNotes] = useState("");
  const [showSelfModal, setShowSelfModal] = useState(false);
const [showRecoModal, setShowRecoModal] = useState(false);
const [showDupResolver, setShowDupResolver] = useState(true);
const [redFlagTouched, setRedFlagTouched] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const isEditing = editingId !== null;
type Mode = "manual" | "garmin";
const [recoveryInputMode, setRecoveryInputMode] = useState<Mode>("manual");


const [lastStructured, setLastStructured] = useState<any | null>(null);
function copyToClipboard(txt: string) {
  if (!txt) return;
  navigator.clipboard?.writeText(txt).catch(()=>{});
}
function startEdit(e: any) {
  // 1) Riporta la data nel date-picker
  setDate(e.date);

  // 2) Imposta i campi base
  setDoms(e.doms ?? null);
  setPains(e.pains ?? "");
  setNotes(e.notes ?? "");

  // 3) Modalità di inserimento + valori
  const hasGarmin = !!e.garmin;
  setRecoveryInputMode(hasGarmin ? "garmin" : "manual");

  // Manuale
  setSleepH(hasGarmin ? null : (e.sleepHours ?? null));
  setSleepM(hasGarmin ? null : (e.sleepMinutes ?? null));

  // Garmin
  setGSleepScore(e.garmin?.sleepScore ?? null);
  if (e.garmin?.sleepDurationMin != null) {
    const mm = e.garmin.sleepDurationMin;
    setGSleepHours(Math.floor(mm / 60));
    setGSleepMinutes(mm % 60);
  } else {
    setGSleepHours(null);
    setGSleepMinutes(null);
  }
  setGRestingHR(e.garmin?.restingHr ?? null);
  setGHRV(e.garmin?.hrv ?? null);
  setGBodyBattery(e.garmin?.bodyBattery ?? null);
  setGTrainingReadiness(e.garmin?.trainingReadiness ?? null);
  setGTrainingStatus((e.garmin?.trainingStatus as any) ?? "");
  setGLoadAnaerobic(e.garmin?.loadFocus?.anaerobic ?? null);
  setGLoadAerobicHigh(e.garmin?.loadFocus?.aerobicHigh ?? null);
  setGLoadAerobicLow(e.garmin?.loadFocus?.aerobicLow ?? null);

  // Percezione
  setPPerc((e.perception?.perceivedRecovery as any) ?? "");
  setPPain(e.perception?.painLevel ?? null);
  setPAreas((e.perception?.affectedAreas ?? []).join(", "));
  setPRed(!!e.perception?.redFlag);

  // Analisi
  setASelf(e.analysis?.selfTest ?? "");
  setANotes(e.analysis?.notes ?? "");
  setAReco(e.analysis?.recommendedAction ?? "");
  setGenSource((e.analysis?.source as any) ?? null);

  // 4) entra in “edit mode”
  setEditingId(e.updatedAt || null);

  // 5) chiudi l’eventuale pannello dettagli
  setDetailEntry(null);
}
function handleCancelEdit() {
  resetForm();
}

function resetForm() {
  // base
  setDoms(null);
  setPains("");
  setNotes("");
  // modalità e sonno manuale
  setRecoveryInputMode("manual");
  setSleepH(null);
  setSleepM(null);
  // garmin
  setGSleepScore(null);
  setGSleepHours(null);
  setGSleepMinutes(null);
  setGRestingHR(null);
  setGHRV(null);
  setGBodyBattery(null);
  setGTrainingReadiness(null);
  setGTrainingStatus("");
  setGLoadAnaerobic(null);
  setGLoadAerobicHigh(null);
  setGLoadAerobicLow(null);
  // percezione
  setPPerc("");
  setPPain(null);
  setPAreas("");
  setPRed(false);
  setRedFlagTouched(false);
  // guidata
  setGAreaSel("");
  setGSymSel("");
  setGSubSel("");
  // analisi
  setASelf("");
  setANotes("");
  setAReco("");
  setGenSource(null);
  setLastStructured(null);
  // stato editing / chooser
  setEditingId(null);
  setShowChooser(false);
  setSelectedUA("");
}

  // --- Garmin (opzionale)
const [gSleepScore, setGSleepScore] = useState<number | null>(null);
const [gSleepHours, setGSleepHours]   = useState<number | null>(null);
const [gSleepMinutes, setGSleepMinutes] = useState<number | null>(null);
const [gRestingHR, setGRestingHR] = useState<number | null>(null);
const [gHRV, setGHRV] = useState<number | null>(null);
const [gBodyBattery, setGBodyBattery] = useState<number | null>(null);
const [gTrainingReadiness, setGTrainingReadiness] = useState<number | null>(null);
const [gTrainingStatus, setGTrainingStatus] = useState<TrainingStatus | "">("");
const [gLoadAnaerobic, setGLoadAnaerobic] = useState<number | null>(null);
const [gLoadAerobicHigh, setGLoadAerobicHigh] = useState<number | null>(null);
const [gLoadAerobicLow, setGLoadAerobicLow] = useState<number | null>(null);

// --- Percezione / sintomi
const [pPerc, setPPerc] = useState<"" | "Ottima" | "Buona" | "Discreta" | "Scarsa">("");
const [pPain, setPPain] = useState<number | null>(null);
const [pRed, setPRed] = useState<boolean>(false);

// --- Analisi / raccomandazione
const [aSelf, setASelf] = useState<string>("");
const [aNotes, setANotes] = useState<string>("");
const [aReco, setAReco] = useState<string>("");

  // --- Garmin (opzionale)

const [gSleepDur] = useState<number | null>(null);   // minuti
const [gResting] = useState<number | null>(null);
const [gBodyBat] = useState<number | null>(null);
const [gTR] = useState<number | null>(null);   // Training Readiness 0..100
const [gStatus] = useState<string>("");
const [gLoadHi] = useState<number | null>(null);
const [gLoadLo] = useState<number | null>(null);


  // --- Garmin ---


const [gHrv] = useState<number | null>(null);
const [gLoadAna, setGLoadAna] = useState<number | null>(null);

// --- Percezione ---
type PercOpt = "" | "Ottima" | "Buona" | "Discreta" | "Scarsa";

const [pAreas, setPAreas] = useState<string>("");   // CSV: "schiena, polpacci"
// --- Selettore guidato Sintomi (cascata) ---
const [pAreaSel] = useState<string>("");
const [pSymptomSel] = useState<string>("");
const [pSubtypeSel] = useState<string>("");

// --- Cascata guidata (area → sintomo → sottotipo)
const [gAreaSel, setGAreaSel] = useState<string>("");
const [gSymSel, setGSymSel] = useState<string>("");
const [gSubSel, setGSubSel] = useState<string>("");

// Quando cambio area/sintomo/sottotipo, svuota i campi analisi
useEffect(() => {
  setASelf("");
  setANotes("");
  setAReco("");
}, [gAreaSel, gSymSel, gSubSel]);

// Crea testi sintetici per pains / analisi
const [genSource, setGenSource] = useState<null | "ai" | "fallback">(null);
function buildGuidedStrings() {
  const area = gAreaSel?.trim();
  const sym = gSymSel?.trim();
  const sub = gSubSel?.trim();
  const parts = [area, sym, sub].filter(Boolean);
  const painString = parts.join(" / ");
  const selfTestHint = area
    ? `Autotest consigliati per ${area}: ROM attivo + palpazione mirata.`
    : "";
  const recoHint = parts.length
    ? `Allenamento consigliato: gestire ${parts.join(" → ").toLowerCase()} con mobilità leggera e carico progressivo.`
    : "";
  return { painString, selfTestHint, recoHint };
}



// --- Analisi ---

const [status, setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
const [err, setErr] = useState("");
const [todayEntries, setTodayEntries] = useState<any[]>([]);
const [selectedUA, setSelectedUA] = useState<string>(""); // updatedAt scelto
const [showChooser, setShowChooser] = useState(false);
const [keepStatus, setKeepStatus] = useState<"idle"|"saving"|"done"|"error">("idle");
const [history, setHistory] = useState<any[]>([]);
const [historyStatus, setHistoryStatus] = useState<"idle"|"loading"|"error">("idle");
async function reloadHistory() {
  try {
    setHistoryStatus("loading");
    const r = await fetch("/api/recovery-history", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) {
      setHistory(j.items || []);
      setHistoryStatus("idle");
    } else {
      setHistoryStatus("error");
    }
  } catch {
    setHistoryStatus("error");
  }
}

useEffect(() => {
  // se l'utente ha toccato il flag, non auto-modificare
  if (redFlagTouched) return;

  const highPain = (pPain ?? 0) >= 7;

  const lowRecovery =
    (gSleepScore != null && gSleepScore < 55) ||
    (gTrainingReadiness != null && gTrainingReadiness < 30);

  const acuteSymptom =
    gSymSel === "Instabilità" ||
    gSymSel === "Strappo sospetto" ||
    (gAreaSel === "Caviglia" && gSymSel === "Gonfiore");

  setPRed(highPain || lowRecovery || acuteSymptom);
}, [pPain, gSleepScore, gTrainingReadiness, gAreaSel, gSymSel, redFlagTouched]);


useEffect(() => { void reloadHistory(); }, [status]);
const loadForDate = async (d: string) => {
  try {
    const iso =
      typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
        ? d
        : new Date(d).toISOString().slice(0, 10);

    if (!iso) {
      setTodayEntries([]);
      setSelectedUA("");
      return;
    }

    const res = await fetch(`/api/recovery-day?date=${encodeURIComponent(iso)}`, { cache: "no-store" });
    const j = await res.json();

    if (res.ok) {
      setTodayEntries(j.entries || []);
      setSelectedUA(j.entries?.[0]?.updatedAt || "");
    } else {
      setTodayEntries([]);
      setSelectedUA("");
    }
  } catch {
    setTodayEntries([]);
    setSelectedUA("");
  }
};

useEffect(() => {
 async function loadForDate(d: string) {
  try {
    const iso =
    
      typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
        ? d
        : new Date(d).toISOString().slice(0, 10);

    if (!iso) { setTodayEntries([]); setSelectedUA(""); setShowChooser(false); return; }
useEffect(() => { void loadForDate(date); }, [date, status]);
const openChooser = async () => {
  setShowChooser(true);
  await loadForDate(date); 
  if ((todayEntries?.length ?? 0) > 1) setShowChooser(true);
};
    const res = await fetch(`/api/recovery-day?date=${encodeURIComponent(iso)}`, { cache: "no-store" });
    const j = await res.json();

    if (res.ok) {
      const entries = j.entries || [];
      setTodayEntries(entries);
      setSelectedUA(entries?.[0]?.updatedAt || "");
      setShowChooser(entries.length > 1); // <— apre chooser se ci sono duplicati
    } else {
      setTodayEntries([]); setSelectedUA(""); setShowChooser(false);
    }
  } catch {
    setTodayEntries([]); setSelectedUA(""); setShowChooser(false);
  }
}


  void loadForDate(date);
}, [date, status]);

function openChooser() {
  setShowChooser(true);
  // ricarico lo stesso giorno per sicurezza (sincronizza la lista)
  void (async () => { await loadForDate(date); })();
}

async function save() {
  setStatus("saving"); setErr("");

  try {
    // --- costruzione blocchi come già fai ---
    const garminRaw = dropNulls({
      sleepScore: gSleepScore,
      sleepDurationMin: (gSleepHours ?? 0) * 60 + (gSleepMinutes ?? 0),
      restingHr: gRestingHR,
      hrv: gHRV,
      bodyBattery: gBodyBattery,
      trainingReadiness: gTrainingReadiness,
      trainingStatus: (gTrainingStatus || "").trim() || null,
      loadFocus: dropNulls({
        anaerobic:  gLoadAnaerobic,
        aerobicHigh: gLoadAerobicHigh,
        aerobicLow:  gLoadAerobicLow,
      }),
    });

    const garmin = (recoveryInputMode === "garmin" && Object.keys(garminRaw).length)
      ? garminRaw : undefined;

    const guided = dropNulls({
      area: gAreaSel || null, symptom: gSymSel || null, subtype: gSubSel || null,
    });

    const perception = dropNulls({
      perceivedRecovery: (pPerc || "").trim() || null,
      painLevel: pPain,
      affectedAreas: (pAreas || "").split(",").map(s=>s.trim()).filter(Boolean),
      redFlag: pRed ? true : null,
      guided: Object.keys(guided).length ? guided : undefined,
    });

    const analysis = dropNulls({
      selfTest: (aSelf || "").trim() || null,
      notes: (aNotes || "").trim() || null,
      recommendedAction: (aReco || "").trim() || null,
      source: genSource || null,
    });

    const entry = dropNulls({
      date, athleteId, doms,
      sleepHours: recoveryInputMode === "manual" ? sleepH : undefined,
      sleepMinutes: recoveryInputMode === "manual" ? sleepM : undefined,
      pains, notes, pending: true,
      updatedAt: new Date().toISOString(),
      garmin,
      perception: Object.keys(perception).length ? perception : undefined,
      analysis:   Object.keys(analysis).length   ? analysis   : undefined,
    });

    // --- nuova API: upsert (replace se editingId presente) ---
    const res = await fetch("/api/recovery-upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchUpdatedAt: editingId, entry })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);

   setStatus("saved");
await reloadHistory();        // aggiorna lista / tabella
resetForm();                  // ⬅️ pulizia completa dei campi
setTimeout(() => setStatus("idle"), 1000);

  } catch (e:any) {
    setErr(e?.message || "Errore");
    setStatus("error");
  }
}


async function keepSelected() {
  if (!selectedUA) return;
  setKeepStatus("saving");
  try {
    
   const dateToKeep = date; // usa la variabile di stato legata all’input
const res = await fetch("/api/recovery-keep", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ date: dateToKeep, updatedAt: selectedUA })
});
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
    setKeepStatus("done");
    setShowChooser(false);  
    resetForm(); // chiude modal e pulisce lo stato locale
  
    // ricarica elenco
    const ref = await fetch(`/api/recovery-day?date=${encodeURIComponent(date)}`, { cache: "no-store" });
const jj = await ref.json();
setTodayEntries(jj.entries || []);
await reloadHistory();


  } catch (e) {
    console.error("[history] fetch error", e); 
    setKeepStatus("error");
  } finally {
    setTimeout(() => setKeepStatus("idle"), 1500);
  }
}
function suggestPlan(opts: {
  doms: number | null,
  perceived?: "" | "Ottima" | "Buona" | "Discreta" | "Scarsa",
  readiness?: number | null,
  redFlag?: boolean
}) {
  const { doms, perceived, readiness, redFlag } = opts;
  if (redFlag) {
    return {
      self: "Red flag presente",
      reco: "Riduci carico. Valuta mobilità + scarico attivo. Evita lavori intensi."
    };
  }

  let self = "Condizioni nella norma.";
  if ((doms ?? 0) >= 6) self = "DOMS elevati.";
  else if (perceived === "Scarsa") self = "Percezione scarsa.";
  else if (perceived === "Discreta") self = "Percezione discreta.";

  let reco = "Allenamento regolare.";
  const tr = readiness ?? -1;
  if (tr >= 0) {
    if (tr >= 70 && (doms ?? 0) <= 3) reco = "Qualità: lavori medi/veloci consentiti.";
    else if (tr <= 40 || (doms ?? 0) >= 6) reco = "Scarico attivo o corsa facile.";
    else reco = "Allenamento facile/medio.";
  } else {
    if ((doms ?? 0) >= 6 || perceived === "Scarsa") reco = "Scarico attivo.";
    else if (perceived === "Discreta") reco = "Facile/medio.";
  }

  return { self, reco };
}

const [genStatus, setGenStatus] = useState<"idle"|"loading"|"error">("idle");

async function handleGenerateWith4o() {
  try {
    setGenStatus("loading");
    // Costruisci un payload con ciò che serve all’analisi
    const payload = {
  date,
  doms,
  sleepHours: sleepH,
  sleepMinutes: sleepM,
  pains,
  notes,
  perception: {
    perceivedRecovery: pPerc || null,
    painLevel: pPain,
    affectedAreas: (pAreas || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    redFlag: pRed
  },
  garmin: {
    sleepScore: gSleepScore,
    restingHr: gRestingHR,
    hrv: gHRV,
    bodyBattery: gBodyBattery,
    trainingReadiness: gTrainingReadiness,
    trainingStatus: gTrainingStatus || null,
    loadFocus: {
      anaerobic: gLoadAnaerobic,
      aerobicHigh: gLoadAerobicHigh,
      aerobicLow: gLoadAerobicLow
    }
  },
  guided: { area: gAreaSel, symptom: gSymSel, subtype: gSubSel }

};


    const res = await fetch("/api/generate-analysis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
      
    });
    
    const j = await res.json();
       if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
       setGenSource((j?.source === "ai" || j?.source === "fallback") ? j.source : null);
setLastStructured(j?.structured ?? null);


    // Compila i campi Analisi con il risultato
    setASelf(j?.selfTest ?? "");
    setANotes(j?.notes ?? "");
    setAReco(j?.recommendedAction ?? "");
    setGenStatus("idle");
  } catch (e) {
    console.error("[generate-analysis]", e);
    setGenStatus("error");
    setTimeout(() => setGenStatus("idle"), 2000);
  }
}
const [detailEntry, setDetailEntry] = useState<any | null>(null);
const symOptions = useMemo<string[]>(() => {
  if (!gAreaSel) return [];
  return SYMPTOMS_BY_AREA[gAreaSel as keyof typeof SYMPTOMS_BY_AREA] ?? [];
}, [gAreaSel]);

const subOptions = useMemo<string[]>(() => {
  if (!gAreaSel || !gSymSel) return [];
  const key = `${gAreaSel}|${gSymSel}`;
  return SUBTYPES_BY_PAIR[key] ?? [];
}, [gAreaSel, gSymSel]);


  return (
    
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Flusso Mattino — Recovery</h1>

      <div style={{ display:"grid", gap:12, marginTop:16 }}>
        <label>
          Data
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
{showChooser && todayEntries.length > 1 && (
  <div style={{marginTop:8}}>
    <button type="button" onClick={openChooser}>
      Gestisci duplicati per {date}
    </button>
  </div>
)}

        <label>
          DOMS (0–10, step 0.5)
          <input
            type="number" step={0.5} min={0} max={10}
            value={doms ?? ""} placeholder="es. 2.5"
            onChange={e => {
              const v = Number(e.target.value);
              setDoms(Number.isNaN(v) ? null : Math.round(clamp(v,0,10)*2)/2);
            }}
          />
        </label>

{(todayEntries.length > 1 || showChooser) && (
  <div className="mt-6 border rounded p-3">
    <strong>Più registrazioni per questa data ({date})</strong>
    <div className="text-sm text-gray-600 mb-2">
      Scegli quale mantenere (le altre verranno rimosse).
    </div>

    <div className="space-y-2">
      {todayEntries.map((e:any) => (
        <label key={e.updatedAt} className="flex items-start gap-2">
          <input
            type="radio"
            name="keepEntry"
            value={e.updatedAt}
            checked={selectedUA === e.updatedAt}
            onChange={() => setSelectedUA(e.updatedAt)}
          />
          <span>
            <div><b>updatedAt:</b> {e.updatedAt}</div>
            <div><b>DOMS:</b> {e.doms} &nbsp; <b>Sonno:</b> {e.sleepHours}h {e.sleepMinutes}m</div>
            <div><b>Fastidi:</b> {e.pains || "-"}</div>
            <div><b>Note:</b> {e.notes || "-"}</div>
            <div><b>pending:</b> {String(e.pending)}</div>
          </span>
        </label>
      ))}
    </div>

    <div style={{display:"flex", gap:8, marginTop:8}}>
      <button
        onClick={keepSelected}
        className="px-3 py-1 rounded bg-blue-600 text-white"
        disabled={!selectedUA || keepStatus === "saving"}
      >
        {keepStatus === "saving" ? "Salvo..." : "Mantieni selezionata (approva)"}
      </button>

      {/* NUOVO: annulla che chiude senza toccare nulla */}
      <button
        onClick={() => setShowChooser(false)}
        className="px-3 py-1 rounded border"
        disabled={keepStatus === "saving"}
      >
        Annulla
      </button>

      {keepStatus === "done" && <span className="ml-2 text-green-700">Fatto ✔</span>}
      {keepStatus === "error" && <span className="ml-2 text-red-700">Errore</span>}
    </div>
  </div>
)}

  <label>
          Fastidi (testo breve)
          <input type="text" value={pains} onChange={e => setPains(e.target.value)} />
        </label>

        <label>
          Note
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </label>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => void save()} disabled={status==="saving"}>Salva</button>
          <button onClick={resetForm} disabled={status==="saving"}>Reset</button>

          <span style={{ fontSize:14, opacity:.8 }}>
            Stato: {status === "idle" ? "—" : status}
          </span>
          {status==="error" && <span>❌ {err}</span>}
          {status==="saved" && <span>✅ salvato</span>}
        </div>
      </div>
    <div style={{display:"flex", gap:8, marginTop:12}}>
  <button
    type="button"
    onClick={() => setRecoveryInputMode("manual")}
    style={{
      padding:"6px 10px",
      borderRadius:8,
      border:"1px solid #ccc",
      background: recoveryInputMode === "manual" ? "#eef6ff" : "#fff"
    }}
  >
    Inserimento manuale
  </button>

  <button
    type="button"
    onClick={() => setRecoveryInputMode("garmin")}
    style={{
      padding:"6px 10px",
      borderRadius:8,
      border:"1px solid #ccc",
      background: recoveryInputMode === "garmin" ? "#eef6ff" : "#fff"
    }}
  >
    Compila con Garmin
  </button>
</div>
<div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
  Verrà salvato: {recoveryInputMode === "manual" ? "sonno manuale (h/min)" : "dati Garmin"}
</div>
{/* --- SONNO: inserimento MANUALE --- */}
{recoveryInputMode === "manual" && (
  <div style={{ border:"1px solid #ccc", borderRadius:8, padding:12, marginTop:16 }}>
    <strong>Sonno — inserimento manuale</strong>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8 }}>
      <label>
        Ore di sonno (0–12)
        <input
          type="number" min={0} max={12} step={1}
          value={sleepH ?? ""} placeholder="es. 6"
          onChange={e => {
            const v = Number(e.target.value);
            setSleepH(Number.isNaN(v) ? null : clamp(v,0,12));
          }}
        />
      </label>

      <label>
        Minuti (0/15/30/45)
        <input
          type="number" min={0} max={59} step={15}
          value={sleepM ?? ""} placeholder="es. 15"
          onChange={e => {
            const v = Number(e.target.value);
            if (Number.isNaN(v)) { setSleepM(null); return; }
            const allowed = [0,15,30,45];
            const snapped = allowed.reduce((a,b)=> Math.abs(b-v) < Math.abs(a-v) ? b : a, 0);
            setSleepM(snapped);
          }}
        />
      </label>
    </div>
  </div>
)}

{/* --- SONNO: dati GARMIN --- */}
{recoveryInputMode === "garmin" && (
  <div style={{ border:"1px solid #ccc", borderRadius:8, padding:12, marginTop:16 }}>
    <strong>Garmin (opzionale)</strong>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8 }}>
      <label>
        Punteggio sonno
        <input type="number"
          value={gSleepScore ?? ""} placeholder=""
          onChange={e => setGSleepScore(toInt(e.currentTarget.value, 0, 100))}
        />
      </label>

      <label>
        Ore di sonno
        <input type="number" min={0} max={12}
          value={gSleepHours ?? ""} placeholder=""
          onChange={e => setGSleepHours(toInt(e.currentTarget.value, 0, 12))}
        />
      </label>

      <label>
        Minuti di sonno
        <input type="number" min={0} max={59} step={15}
          value={gSleepMinutes ?? ""} placeholder=""
          onChange={e => setGSleepMinutes(toInt(e.currentTarget.value, 0, 59))}
        />
      </label>

      <label>
        Frequenza cardiaca a riposo
        <input type="number"
          value={gRestingHR ?? ""} placeholder=""
          onChange={e => setGRestingHR(toInt(e.currentTarget.value, 0, 250))}
        />
      </label>

      <label>
        HRV (ms)
        <input type="number"
          value={gHRV ?? ""} placeholder=""
          onChange={e => setGHRV(toInt(e.currentTarget.value, 0, 300))}
        />
      </label>

      <label>
        Body Battery
        <input type="number"
          value={gBodyBattery ?? ""} placeholder=""
          onChange={e => setGBodyBattery(toInt(e.currentTarget.value, 0, 100))}
        />
      </label>

      <label>
        Training Readiness (0–100)
        <input type="number"
          value={gTrainingReadiness ?? ""} placeholder=""
          onChange={e => setGTrainingReadiness(toInt(e.currentTarget.value, 0, 100))}
        />
      </label>

      <label>
        Stato allenamento
        <select
          value={gTrainingStatus}
          onChange={e => setGTrainingStatus(e.currentTarget.value as TrainingStatus | "")}
        >
          <option value=""></option>
          <option value="Productive">Produttivo</option>
          <option value="Maintaining">Mantenimento</option>
          <option value="Peaking">Punta di forma</option>
          <option value="Unproductive">Non produttivo</option>
          <option value="Overreaching">Sovraccarico</option>
          <option value="Detraining">In calo</option>
          <option value="Recovery">Recupero</option>
        </select>
      </label>

      <label>
        Carico anaerobico
        <input type="number"
          value={gLoadAnaerobic ?? ""} placeholder=""
          onChange={e => setGLoadAnaerobic(toInt(e.currentTarget.value, 0, 1000))}
        />
      </label>

      <label>
        Carico aerobico alto
        <input type="number"
          value={gLoadAerobicHigh ?? ""} placeholder=""
          onChange={e => setGLoadAerobicHigh(toInt(e.currentTarget.value, 0, 1000))}
        />
      </label>

      <label>
        Carico aerobico basso
        <input type="number"
          value={gLoadAerobicLow ?? ""} placeholder=""
          onChange={e => setGLoadAerobicLow(toInt(e.currentTarget.value, 0, 1000))}
        />
      </label>
    </div>
  </div>
)}

{/* --- Percezione / Sintomi (opzionale) --- */}
<div style={{ border:"1px solid #ccc", borderRadius:8, padding:12, marginTop:16 }}>
  <strong>Percezione / Sintomi (opzionale)</strong>

  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8 }}>
    <label>
      Recupero percepito
      <select value={pPerc} onChange={e => setPPerc(e.currentTarget.value as typeof pPerc)} style={{minWidth:220}}>
        <option value=""></option>
        <option value="Ottima">Ottima</option>
        <option value="Buona">Buona</option>
        <option value="Discreta">Discreta</option>
        <option value="Scarsa">Scarsa</option>
      </select>
    </label>

    <label>
      Livello di dolore (0–10)
      <input type="number" min={0} max={10}
        value={pPain ?? ""} onChange={e => setPPain(toInt(e.currentTarget.value, 0, 10))}
        style={{minWidth:220}}
      />
    </label>

    <label>
      Aree coinvolte (CSV)
      <input value={pAreas} onChange={e => setPAreas(e.currentTarget.value)} placeholder="es. polpacci, quadricipiti" style={{minWidth:220}} />
    </label>
  </div>

  {/* Cascata guidata */}
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
    <label>
      Zona coinvolta
      <select value={gAreaSel} onChange={e => { setGAreaSel(e.currentTarget.value); setGSymSel(""); setGSubSel(""); }} style={{minWidth:220}}>
        <option value=""></option>
        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </label>

    <label>
      Tipo di fastidio
      <select
  value={gSymSel}
  onChange={e => { setGSymSel(e.currentTarget.value); setGSubSel(""); }}
  style={{minWidth:220}}
  disabled={!gAreaSel}
>
  <option value=""></option>
  {symOptions.map(s => (
    <option key={s} value={s}>{s}</option>
  ))}
</select>
    </label>

    <label>
      Sottotipo
      <select
  value={gSubSel}
  onChange={e => setGSubSel(e.currentTarget.value)}
  style={{minWidth:220}}
  disabled={!gAreaSel || !gSymSel}
>
  <option value=""></option>
  {subOptions.map(x => (
    <option key={x} value={x}>{x}</option>
  ))}
</select>
    </label>
  </div>

  <div style={{display:"flex", gap:8, alignItems:"center", marginTop:10}}>
    <button
  type="button"
  onClick={() => {
    const { painString } = buildGuidedStrings();
    if (!pains && painString) setPains(painString);
    setGenSource(null);                 // reset etichetta finché non arriva la risposta
    void handleGenerateWith4o();        // ⬅️ CHIAMA davvero l’AI
  }}
>
  Genera analisi con 4o
</button>

{genSource && (
  <span style={{fontSize:12, opacity:.7}}>
    Fonte analisi: {genSource === "ai" ? "AI" : "Euristica locale"}
  </span>
)}
Red flag (richiede modifica allenamento)
    {genSource && (
  <span title={genSource === "ai" ? "Generato da modelli AI" : "Generato con regole locali"}
        style={{
          marginLeft:8, padding:"2px 8px", borderRadius:12,
          fontSize:12, background: genSource === "ai" ? "#dbf4ff" : "#eee",
          border: "1px solid " + (genSource === "ai" ? "#86d3ff" : "#ccc")
        }}>
    Fonte: {genSource === "ai" ? "AI" : "Fallback"}
  </span>
)}

  </div>
</div>

{/* --- Analisi / Raccomandazione (opzionale) --- */}
<div style={{ border:"1px solid #ccc", borderRadius:8, padding:12, marginTop:16 }}>
  <strong>Analisi / Raccomandazione (opzionale)</strong>

  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:8 }}>
    {/* Auto test */}
    <div>
      <label style={{display:"block", marginBottom:4}}>Auto test</label>
      <textarea
        rows={3}
        value={aSelf}
        onChange={e => setASelf(e.currentTarget.value)}
        placeholder="Autotest consigliati…"
        style={{width:"100%"}}
      />
      <div style={{display:"flex", gap:8, marginTop:6}}>
        <button type="button" onClick={()=>setShowSelfModal(true)}>Espandi</button>
        <button type="button" onClick={()=>copyToClipboard(aSelf)}>Copia</button>
      </div>
    </div>

    {/* Note (analisi) */}
    <div>
      <label style={{display:"block", marginBottom:4}}>Note (analisi)</label>
      <textarea
        rows={3}
        value={aNotes}
        onChange={e => setANotes(e.currentTarget.value)}
        placeholder="Note aggiuntive…"
        style={{width:"100%"}}
      />
    </div>

    {/* Azione consigliata */}
    <div>
      <label style={{display:"block", marginBottom:4}}>Azione consigliata</label>
      <div style={{marginTop:6, fontSize:12, opacity:.7}}>
 {genSource && (
  <div style={{marginTop:6, fontSize:12, opacity:.7}}>
    Fonte analisi: {genSource === "ai" ? "AI" : "Fallback"}
  </div>
)}

</div>

      <textarea
        rows={3}
        value={aReco}
        onChange={e => setAReco(e.currentTarget.value)}
        placeholder="Allenamento/recupero suggerito…"
        style={{width:"100%"}}
      />
      <div style={{display:"flex", gap:8, marginTop:6}}>
        <button type="button" onClick={()=>setShowRecoModal(true)}>Espandi</button>
        <button type="button" onClick={()=>copyToClipboard(aReco)}>Copia</button>
      </div>
    </div>
  </div>
</div>


<section style={{ marginTop: 24 }}>
  <h2>Ultimi 7 giorni</h2>
{isEditing && (
  <div style={{margin:"8px 0 12px", padding:"8px 10px", border:"1px dashed #999", borderRadius:8}}>
    Stai <b>modificando</b> la registrazione del {date}.
    <button style={{marginLeft:8}} onClick={handleCancelEdit}>Annulla modifica</button>
  </div>
)}

  {historyStatus === "loading" && <div>Carico…</div>}

  {historyStatus === "idle" && (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
       <thead style={{ position:"sticky", top:0, background:"#fff", zIndex:1 }}>
  <tr>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:110}}>Data</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:60}}>DOMS</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:120}}>Sonno</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:90}}>SleepScore</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:70}}>TR</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px"}}>Note</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:96}}>Stato</th>
    <th style={{textAlign:"left", borderBottom:"1px solid #444", padding:"8px 6px", width:120}}>Dettagli</th>
  </tr>
</thead>

        <tbody>
  {history.map((e:any, idx:number) => {
    const sleep =
      e.sleepHours != null || e.sleepMinutes != null
        ? `${e.sleepHours ?? 0}h ${e.sleepMinutes ?? 0}m`
        : e.garmin?.sleepDurationMin != null
        ? `${Math.floor(e.garmin.sleepDurationMin/60)}h ${e.garmin.sleepDurationMin%60}m`
        : "—";

    const rowStyle: React.CSSProperties = {
      background: idx % 2 === 0 ? "#fafafa" : "#fff"
    };

    const badge = (e.pending ?? false)
      ? <span style={{
          display:"inline-block", padding:"2px 8px", borderRadius:999,
          background:"#fde68a", color:"#8a6d00", fontSize:12
        }}>pending</span>
      : <span style={{
          display:"inline-block", padding:"2px 8px", borderRadius:999,
          background:"#d1fae5", color:"#065f46", fontSize:12
        }}>ok</span>;

    return (
      <tr key={e.updatedAt} style={rowStyle}>
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>{e.date}</td>
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>{e.doms ?? "—"}</td>
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>{sleep}</td>
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>{e.garmin?.sleepScore ?? "—"}</td>
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>{e.garmin?.trainingReadiness ?? "—"}</td>

        {/* Note con ellissi */}
        <td style={{
          borderBottom:"1px solid #e5e7eb", padding:"8px 6px",
          maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
        }}>
          {e.notes ?? e.analysis?.notes ?? "—"}
        </td>

        {/* Badge stato */}
        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>
          {badge}
        </td>

        <td style={{borderBottom:"1px solid #e5e7eb", padding:"8px 6px"}}>
          <button
            type="button"
            onClick={() => setDetailEntry(e)}
            style={{
              padding:"6px 10px", borderRadius:6, border:"1px solid #ddd",
              background:"#fff", cursor:"pointer"
            }}
          >
            Apri dettagli
          </button>
          <button
  type="button"
  onClick={() => startEdit(e)}
  style={{ marginLeft: 8, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff" }}
>
  Modifica
</button>

        </td>
      
      </tr>
    );
  })}

  {history.length === 0 && (
    <tr>
      <td colSpan={8} style={{ padding:"10px 6px" }}>Nessun dato negli ultimi 7 giorni.</td>
    </tr>
  )}
</tbody>
      </table>
      {detailEntry && (
  <div style={{ marginTop: 12, padding: 12, border: "1px solid #aaa", borderRadius: 8 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
      <strong>Dettagli — {detailEntry.date}</strong>
      <button type="button" onClick={() => setDetailEntry(null)}>Chiudi</button>
      <button type="button" onClick={() => startEdit(detailEntry)}>
  Modifica questa
</button>

    </div>

    {/* Sezioni leggibili */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      <div>
        <h4>Valori base</h4>
        <div>DOMS: <b>{detailEntry.doms ?? "—"}</b></div>
        <div>Sonno: <b>
          {detailEntry.sleepHours != null || detailEntry.sleepMinutes != null
            ? `${detailEntry.sleepHours ?? 0}h ${detailEntry.sleepMinutes ?? 0}m`
            : (detailEntry.garmin?.sleepDurationMin != null
                ? `${Math.floor(detailEntry.garmin.sleepDurationMin/60)}h ${detailEntry.garmin.sleepDurationMin%60}m`
                : "—")}
        </b></div>
        <div>Fastidi: {detailEntry.pains || "—"}</div>
        <div>Note: {detailEntry.notes || "—"}</div>
        <div>Pending: {String(detailEntry.pending ?? false)}</div>
        <div>updatedAt: {detailEntry.updatedAt}</div>
      </div>

      <div>
        <h4>Percezione</h4>
        <div>Perceived: {detailEntry.perception?.perceivedRecovery ?? "—"}</div>
        <div>Dolore (0–10): {detailEntry.perception?.painLevel ?? "—"}</div>
        <div>Aree: {(detailEntry.perception?.affectedAreas ?? []).join(", ") || "—"}</div>
        <div>Red flag: {String(detailEntry.perception?.redFlag ?? false)}</div>
      </div>

      <div>
        <h4>Garmin</h4>
        <div>SleepScore: {detailEntry.garmin?.sleepScore ?? "—"}</div>
        <div>Resting HR: {detailEntry.garmin?.restingHr ?? "—"}</div>
        <div>HRV: {detailEntry.garmin?.hrv ?? "—"}</div>
        <div>Body Battery: {detailEntry.garmin?.bodyBattery ?? "—"}</div>
        <div>Training Readiness: {detailEntry.garmin?.trainingReadiness ?? "—"}</div>
        <div>Training Status: {detailEntry.garmin?.trainingStatus ?? "—"}</div>
        <div>Load Focus:
          {" "}{detailEntry.garmin?.loadFocus
            ? `Ana ${detailEntry.garmin.loadFocus.anaerobic ?? "—"}` +
              `, Aer High ${detailEntry.garmin.loadFocus.aerobicHigh ?? "—"}` +
              `, Aer Low ${detailEntry.garmin.loadFocus.aerobicLow ?? "—"}`
            : "—"}
        </div>
      </div>

     <div>
  <h4>Analisi</h4>
  <div>Self test: {detailEntry.analysis?.selfTest ?? "—"}</div>
  <div>Note (analisi): {detailEntry.analysis?.notes ?? "—"}</div>
  <div>Azione consigliata: <b>{detailEntry.analysis?.recommendedAction ?? "—"}</b></div>
  <div>Fonte analisi: {detailEntry.analysis?.source === "ai" ? "AI" : (detailEntry.analysis?.source || "—")}</div>
</div>

    </div>

     </div>
)}

    </div>
  )}

  {/* I pulsanti/azioni devono stare FUORI dalla tabella */}
{historyStatus === "idle" && (
  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
    <button type="button" onClick={() => void reloadHistory()}>Ricarica</button>
    <button type="button" onClick={() => void openChooser()}>Risolvi duplicati</button>
  </div>
)}

  
</section>

{/* Overlay / Modal per Auto test */}
{showSelfModal && (
  <div role="dialog" aria-modal="true"
       style={{
         position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
         display:"grid", placeItems:"center", zIndex:1000
       }}
       onClick={()=>setShowSelfModal(false)}
  >
    <div style={{background:"#fff", padding:16, borderRadius:8, width:"min(720px, 92vw)"}}
         onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
        <b>Auto test</b>
        <div style={{display:"flex", gap:8}}>
          <button onClick={()=>copyToClipboard(aSelf)}>Copia</button>
          <button onClick={()=>setShowSelfModal(false)}>Chiudi</button>
        </div>
      </div>
      <div style={{whiteSpace:"pre-wrap", lineHeight:1.5}}>{aSelf || "—"}</div>
    </div>
  </div>
)}

{/* Overlay / Modal per Azione consigliata */}
{showRecoModal && (
  <div role="dialog" aria-modal="true"
       style={{
         position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
         display:"grid", placeItems:"center", zIndex:1000
       }}
       onClick={()=>setShowRecoModal(false)}
  >
    <div style={{background:"#fff", padding:16, borderRadius:8, width:"min(720px, 92vw)"}}
         onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
        <b>Azione consigliata</b>
        <div style={{display:"flex", gap:8}}>
          <button onClick={()=>copyToClipboard(aReco)}>Copia</button>
          <button onClick={()=>setShowRecoModal(false)}>Chiudi</button>
        </div>
      </div>
      <div style={{whiteSpace:"pre-wrap", lineHeight:1.5}}>{aReco || "—"}</div>
    </div>
  </div>
)}

      
    </main>
    
  );
}
