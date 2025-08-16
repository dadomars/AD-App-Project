// Tipi per recovery_log.json

export const RECOVERY_LOG_FILE = "recovery_log.json";

/** Dati oggettivi letti da Garmin (inseribili anche a mano) */
export interface GarminData {
  sleepScore?: number;          // 0..100
  sleepHours?: number;          // 0..12
  sleepMinutes?: number;        // 0, 15, 30, 45
  /** opzionale: totale minuti (se vuoi calcolarlo: hours*60 + minutes) */
  sleepDurationMin?: number;

  restingHR?: number;           // bpm
  hrv?: number;                 // ms
  bodyBattery?: number;         // 0..100
  trainingReadiness?: number;   // 0..100
  /** stato di training come riportato da Garmin (testo) */
  trainingStatus?: string;
  /** focus carico: valori dalle schermate Garmin */
  loadFocus?: {
    anaerobic?: number;
    aerobicHigh?: number;
    aerobicLow?: number;
  };
}

/** Percezione soggettiva */
export type PerceivedRecovery = "ottima" | "buona" | "discreta" | "scarsa";

export interface PerceptionData {
  perceivedRecovery?: PerceivedRecovery;
  /** elenco DOMS: zona + intensità 0..10 */
  doms?: { area: string; level: number }[];
  /** dolore acuto 0..10 */
  painLevel?: number;
  /** distretti con fastidi */
  affectedAreas?: string[];
  /** bandierina rossa: serve modificare l’allenamento */
  redFlag?: boolean;
}

/** Analisi integrata progetto */
export interface IntegratedAnalysis {
  /** sintesi stato attuale (self test) */
  selfTest?: string;
  /** note su come sonno/HRV/readiness/DOMS impattano la giornata */
  notes?: string;
  /** azione consigliata: tipo/intensità/restrizioni allenamento */
  recommendedAction?: string;
}

/** Allegati (es. screenshot Garmin) */
export interface Attachments {
  screenshots?: string[]; // percorsi o nomi file salvati dall’app
}

/** Singola entry del log */
export interface RecoveryEntry {
  date: string;
  athleteId: string;

  // core attuali
  doms?: number | null;
  sleepHours?: number | null;
  sleepMinutes?: number | null;
  pains?: string;
  notes?: string;
  pending?: boolean;
  updatedAt: string;

  // Garmin (inserimento manuale possibile)
  garmin?: {
    sleepScore?: number | null;
    sleepDurationMin?: number | null;   // alternativa alle ore:minuti
    restingHr?: number | null;
    hrv?: number | null;                 // ms
    bodyBattery?: number | null;
    trainingReadiness?: number | null;  // 0..100
    trainingStatus?: string | null;     // "Productive", "Recovery", ecc.
    loadFocus?: {
      anaerobic?: number | null;
      aerobicHigh?: number | null;
      aerobicLow?: number | null;
    };
  };

  // percezione/sintomi
  perception?: {
    perceivedRecovery?: "Ottima" | "Buona" | "Discreta" | "Scarsa" | null;
    painLevel?: number | null;          // 0..10
    affectedAreas?: string[] | null;    // lista distretti
    redFlag?: boolean | null;           // richiede modifica allenamento?
  };

  // analisi e raccomandazione (testuale)
  analysis?: {
    selfTest?: string | null;
    notes?: string | null;
    recommendedAction?: string | null;
  };
}


/** File di log completo */
export interface RecoveryLog {
  schema: 1;
  entries: RecoveryEntry[];
}
