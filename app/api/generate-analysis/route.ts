import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

type Payload = {
  date?: string;
  doms?: number | null;
  sleepHours?: number | null;
  sleepMinutes?: number | null;
  notes?: string;
  pains?: string;
  perception?: {
    perceivedRecovery?: string | null;
    painLevel?: number | null;
    affectedAreas?: string[];
    redFlag?: boolean;
  };
  garmin?: {
    sleepScore?: number | null;
    restingHr?: number | null;
    hrv?: number | null;
    bodyBattery?: number | null;
    trainingReadiness?: number | null;
    trainingStatus?: string | null;
    loadFocus?: {
      anaerobic?: number | null;
      aerobicHigh?: number | null;
      aerobicLow?: number | null;
    };
  };
  guided?: {
    area?: string;
    symptom?: string;
    subtype?: string;
  };
};

// ---------- fallback locale ----------
function heuristicCoach(body: Payload) {
  const area = body.guided?.area || "";
  const symptom = body.guided?.symptom || "";
  const subtype = body.guided?.subtype || "";
  const pain = body.perception?.painLevel ?? null;
  const red = !!body.perception?.redFlag;

  const sleepScore = body.garmin?.sleepScore ?? null;
  const tr = body.garmin?.trainingReadiness ?? null;

  const SELFTEST_BY_AREA: Record<string, string> = {
    Spalla: "Neer + Hawkins-Kennedy + test abd/rot contro resistenza",
    Gomito: "Cozen (epicondilite), test flessori (epitrocleite)",
    "Polso/Mano": "Finkelstein (De Quervain), Phalen/Tinel",
    Schiena: "Schober modificato, estensione/flessione segmentale, SLR",
    Anca: "FABER/FADIR, squat monopodalico",
    Ginocchio: "Squat monopodalico, McMurray/Thessaly",
    "Caviglia/Piede": "Ottawa rules (se trauma), equilibrio monopodalico",
  };

  let selfTest =
    SELFTEST_BY_AREA[area] || "Valutazione funzionale specifica della zona";
  let reco =
    "Allenamento gestito: mobilità specifica, attivazione leggera; evita lavori esplosivi e impatti.";
  const notes: string[] = [];

  if (red || (pain != null && pain >= 7)) {
    reco =
      "Riduci intensità al minimo: mobilità dolce + cammino. Se persiste/peggiora > 48h valuta consulto specialistico.";
    notes.push("Dolore alto o red flag → priorità al controllo del sintomo.");
  }
  if ((sleepScore != null && sleepScore < 55) || (tr != null && tr < 30)) {
    notes.push(
      "Recupero basso (sleep/TR): preferisci tecnica e mobilità; rinvia lavori intensi."
    );
  }

  const s = symptom.toLowerCase();
  const a = area.toLowerCase();
  const sub = subtype.toLowerCase();

  if (a.includes("ginocchio") && s.includes("dolore rotuleo")) {
    if (sub.includes("patello-femorale") || sub.includes("rotuleo anteriore")) {
      notes.push(
        "Controllo rotuleo + quadricipite (VMO), attenzione a angoli di flessione alti."
      );
      reco =
        "Tecnica su piano + isometrie quadricipite (5×30–45s) + mobilità femoro-rotulea; evita discese/pliometria.";
    } else if (sub.includes("tendine rotuleo")) {
      notes.push(
        "Carico isometrico progressivo su tendine rotuleo; evita sprint/pliometria inizialmente."
      );
      reco =
        "Isometrie tendine rotuleo (5×45s) + eccentriche leggere; corsa facile, no sprint.";
    }
  }
  if (a.includes("ginocchio") && s.includes("rigidità")) {
    notes.push("Mobilità femoro-rotulea + quadricipite, isometrie leggere.");
    reco =
      "Tecnica leggera + mobilità + isometrie quadricipite; evita discese/pliometria.";
  }
  if (a.includes("schiena") && s.includes("rigidità")) {
    notes.push("Mobilità catena posteriore + estensioni McKenzie se tollerate.");
    reco =
      "Camminata + estensioni leggere; evita carichi in flessione profonda.";
  }
  if (a.includes("spalla") && s.includes("dolore")) {
    notes.push("Isometrie a parete + controllo scapolare.");
    reco =
      "Spinta isometrica leggera + mobilità scapolo-omerale; evita overhead pesante.";
  }

  return {
    selfTest,
    notes: notes.join(" "),
    recommendedAction: reco,
  };
}

export async function POST(req: Request) {
  // 1) leggo il body UNA sola volta
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  try {
    // 2) validazione minima
    if (!body?.guided?.area || !body?.guided?.symptom) {
      return NextResponse.json(
        { error: "area e symptom sono obbligatori" },
        { status: 400 }
      );
    }

    // 3) no API key → fallback
    if (!process.env.OPENAI_API_KEY) {
      const h = heuristicCoach(body);
      return NextResponse.json({ ok: true, source: "fallback", ...h });
    }

    // 4) prompt + risposta in JSON
    const sys = `
Sei un fisioterapista sportivo. Rispondi in modo pratico, conciso e sicuro.
MAI dare diagnosi mediche. Fornisci:
- 2–3 "assessment" (auto-test semplici) con descrizione di 1 riga ciascuno.
- Una "routine" di 3 blocchi: "warmup", "mobility", "strength".
  Ogni blocco 2–4 esercizi con serie×ripetizioni o tempo.
- "cautions": 1–2 attenzioni.
Se dolore alto (>=7) o red flag, riduci intensità e segnala cautela.
Adatta a: area, sintomo, sottotipo, DOMS, TR, HRV, SleepScore.
Restituisci SOLO JSON; niente markdown.`;

    const u = `
INPUT
Area: ${body.guided?.area || "-"}
Sintomo: ${body.guided?.symptom || "-"}
Sottotipo: ${body.guided?.subtype || "-"}
DOMS: ${body.doms ?? "n/d"} | Pain(0-10): ${body.perception?.painLevel ?? "n/d"} | RedFlag: ${!!body.perception?.redFlag}
Perceived: ${body.perception?.perceivedRecovery ?? "n/d"}
SleepScore: ${body.garmin?.sleepScore ?? "n/d"} | TR: ${body.garmin?.trainingReadiness ?? "n/d"} | HRV: ${body.garmin?.hrv ?? "n/d"}
Carichi: Ana=${body.garmin?.loadFocus?.anaerobic ?? "n/d"} High=${body.garmin?.loadFocus?.aerobicHigh ?? "n/d"} Low=${body.garmin?.loadFocus?.aerobicLow ?? "n/d"}

OUTPUT_JSON_SCHEMA
{
  "selfTest": "string",
  "notes": "string",
  "recommendedAction": "string",
  "assessment": [ { "name":"string", "how":"string" } ],
  "routine": {
    "warmup":   [ { "name":"string", "dose":"string" } ],
    "mobility": [ { "name":"string", "dose":"string" } ],
    "strength": [ { "name":"string", "dose":"string" } ]
  },
  "cautions": [ "string" ]
}

VINCOLI
- JSON valido con tutte le chiavi.
- Esercizi coerenti con area/sintomo/sottotipo.
- Dose variabile (tempo o serie×ripetizioni).`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: u },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const h = heuristicCoach(body);
      return NextResponse.json({ ok: true, source: "fallback", ...h });
    }

    // 5) compact dei 3 campi già previsti dalla UI
    const selfTest =
      parsed.selfTest ||
      (Array.isArray(parsed.assessment)
        ? parsed.assessment.map((t: any) => `${t.name}: ${t.how}`).join(" | ")
        : "—");

    const blocks: string[] = [];
    const r = parsed.routine || {};
    if (Array.isArray(r.warmup) && r.warmup.length)
      blocks.push(
        "Riscaldamento: " + r.warmup.map((x: any) => `${x.name} (${x.dose})`).join(", ")
      );
    if (Array.isArray(r.mobility) && r.mobility.length)
      blocks.push(
        "Mobilità: " + r.mobility.map((x: any) => `${x.name} (${x.dose})`).join(", ")
      );
    if (Array.isArray(r.strength) && r.strength.length)
      blocks.push(
        "Forza/Attivazione: " + r.strength.map((x: any) => `${x.name} (${x.dose})`).join(", ")
      );

    const recommendedAction =
      parsed.recommendedAction || (blocks.length ? blocks.join(" | ") : "—");

    const notes =
      parsed.notes ||
      (Array.isArray(parsed.cautions) ? parsed.cautions.join(" ") : "");

    return NextResponse.json({
      ok: true,
      source: "ai",
      selfTest,
      notes,
      recommendedAction,
      structured: parsed, // opzionale per UI avanzate
    });
  } catch (e) {
    // 6) qualsiasi errore → fallback locale, RIUSANDO il body già letto
    const h = heuristicCoach(body || {});
    return NextResponse.json({ ok: true, source: "fallback", ...h });
  }
}
