# AD-App --- Project Canvas (MVP)

**Versione**: 0.9 (16-08-2025)\
**Ambito**: portare in app (Next.js + MongoDB) il workflow attuale
basato su file manuali per training, recovery, pianificazione e analisi.

------------------------------------------------------------------------

## 1) Obiettivi

-   **UI semplice** per inserire giornalmente **Recovery** e **Session
    Log**.
-   **Unificazione dati** in MongoDB (addio file sparsi); compatibilità
    1:1 con i JSON storici.
-   **Upload screenshot** (Garmin/altro) e link nella singola entry.
-   **Regole di scelta univoca** per le entry giornaliere (es. una sola
    "scelta" attiva; pendenti da cancellare).
-   **Reset form** dopo salvataggio/modifica.
-   **Base per automazioni** (generazione sessioni, analisi, dashboard)
    leggendo `master_plan.json`, `running_parameters.json`, manuale
    operativo.

------------------------------------------------------------------------

## 2) Stack & convenzioni

-   **Runtime**: Next.js 15 + TypeScript.
-   **Router**: per ora **pages/** (compatibile anche con app/ in
    futuro).\
    Rotte API sotto `pages/api/*` (compatibili con Vercel/Node).
-   **DB**: MongoDB (container Docker mappato su
    `localhost:27018 -> 27017`).
-   **.env.local** (esempio):
    -   `MONGODB_URI=mongodb://dev:devpass@127.0.0.1:27018/?authSource=admin`
    -   `OPENAI_API_KEY=...` (future feature)
-   **TypeScript**: `module` e `moduleResolution` su `NodeNext`;
    `esModuleInterop: true`;
    `types: ["node","next","next/image-types/global"]`.
-   **Percorsi consigliati**:
    -   API: `pwa/pages/api/...`\
    -   Pagine: `pwa/pages/...`\
    -   Librerie: `pwa/lib/...`\
    -   Asset persistenti (upload locali): `pwa/public/uploads/...`
-   **Logica di connessione DB** (import dinamico per evitare errori di
    tipo): `lib/db.ts` esporta `getMongoClient(): Promise<MongoClient>`
    con cache locale al modulo.

------------------------------------------------------------------------

## 3) Modello dati (MongoDB)

### 3.1 Collezioni

-   `entries_recovery`
    -   chiave naturale: `date` (YYYY-MM-DD) + opzionale `athleteId`
    -   campi principali:
        `sleep_score, sleep_duration|sleep_hours, resting_hr, body_battery, training_readiness, perceived_recovery, muscle_soreness|doms, affected_area, pain_level, red_flag, self_test, notes, recommended_action, hrv_ms, training_status, screenshotUrl`
    -   meta: `source` ("manual"\|"garmin"), `status`
        ("saved"\|"pending"), `chosen: boolean`, `createdAt`,
        `updatedAt`
-   `entries_session`
    -   chiave naturale: `date` + `type`
        ("Palestra"\|"Corsa"\|"REST"\|...)
    -   campi: `blocks[] { type, exercise, details, notes }`,
        `calories_equivalent`, `notes`, eventuale
        `training_status`/`garmin_status`
    -   meta: `source`, `status`, `createdAt`, `updatedAt`
-   `master_plan`
    -   documento singolo con `plan_version`, `training_phases[]`,
        `selection_rules`, `timeline`, ecc.
-   `running_parameters`
    -   documento singolo con soglie, zone HR, peso, ecc.

> **Nota**: i campi rispecchiano i JSON storici per retro-compatibilità.
> Migrazioni: import diretto dei file nel DB preservando la struttura.

### 3.2 Indicizzazioni

-   `entries_recovery`: indice `{ date: 1, athleteId: 1 }` univoco su
    (date, athleteId)
-   `entries_session`: indice `{ date: 1, type: 1 }`

------------------------------------------------------------------------

## 4) API (pages/api/\*)

> Tutte le API rispondono `{ ok: boolean, ... }` e usano
> `application/json` tranne l'upload.

### 4.1 Health

-   **GET** `/api/_health/db` → prova connessione Mongo; `{ ok:true }`
    se `client.db().admin().ping()` risponde.

### 4.2 Recovery --- upsert

-   **POST** `/api/recovery/upsert`
    -   body:
        `{ _id?, athleteId?, date, source, fields, status?, screenshotUrl? }`
    -   comportamento: se `_id` presente → `updateOne`; altrimenti
        `insertOne` con `{ chosen:false }`.
    -   **regola "scelta unica"**: endpoint companion
        `/api/recovery/choose` imposta `chosen:true` per l'entry
        selezionata e `chosen:false` per tutte le altre della stessa
        `date`/`athleteId`; endpoint `/api/recovery/purge-pending`
        rimuove le `status:"pending"` più vecchie di N giorni o quelle
        non scelte per la stessa data.

### 4.3 Session Log --- upsert

-   **POST** `/api/sessions/upsert`\
    stesse regole della recovery; struttura `blocks[]` conforme ai JSON
    storici.

### 4.4 Upload screenshot

-   **POST** `/api/upload/screenshot`
    -   disabilita bodyParser; multipart boundary parsing; salva file in
        `public/uploads/YYYY/MM/` con nome unico; ritorna
        `{ ok:true, url:"/uploads/.../file.png" }`.

### 4.5 Utility

-   **GET** `/api/recovery/by-date?date=YYYY-MM-DD`\
-   **GET** `/api/sessions/by-date?date=YYYY-MM-DD`

------------------------------------------------------------------------

## 5) UI (pages/\*)

### 5.1 Pagine iniziali

-   `pages/index.tsx`\
    Home minimale con link a **Recovery**, **Sessions**, **Upload
    Test**.

-   `pages/recovery.tsx`\
    Form giornaliero con:

    -   **Source**: Manuale / Garmin
    -   campi principali (vedi modello) + **file upload** (screenshot) →
        preview URL
    -   **Bottoni**: `Salva/Modifica` (→ POST upsert), `Scegli questa`
        (→ choose), `Pulisci form` (reset)
    -   **Dopo salvataggio**: reset automatico campi; se scelta unica,
        aggiornare UI di conseguenza.

-   `pages/sessions.tsx`\
    Editor a blocchi (lista `blocks[]`) con tipi predefiniti
    (Weightlifting, Strength, Skill, Metcon, Running, Cool-down...).

-   `pages/dev/upload-test/page.tsx`\
    Pagina di test già operativa per `/api/upload/screenshot`.

### 5.2 Stati & validazioni

-   Validazioni base lato client (campi obbligatori: `date`, `source`,
    minimi per recovery/session).\
-   Toast esito operazioni.\
-   Reset form **sempre** dopo `ok:true` dalla API.

------------------------------------------------------------------------

## 6) Regole di business chiave

1.  **Reset campi dopo salvataggio/modifica**: la API risponde con
    `entry`; la UI fa `setState(initial)` e opzionale
    `setLastSaved(entry)`.
2.  **Scelta unica per giornata**: `POST /api/recovery/choose` accetta
    `{ _id, athleteId?, date }`; setta `chosen:true` per l'entry e
    `false` per le altre della stessa chiave; UI mostra badge
    "Selezionata".
3.  **Pending da cancellare**: `POST /api/recovery/purge-pending` (o job
    CRON in futuro) elimina i record `status:"pending"` non scelti per
    la stessa data, o più vecchi di X giorni.
4.  **Upload screenshot**: il file deve essere immagine; dimensione
    massima 20 MB; nome unico; URL relativo servito da Next static.

------------------------------------------------------------------------

## 7) Import dati storici (una tantum)

-   **Target**: collezioni `entries_recovery` e `entries_session` 1:1
    dai file JSON storici.
-   **Strategia**: script Node (fuori Next) che legge i file e fa
    `insertMany`, con normalizzazione minima (alias campi
    `muscle_soreness`→`doms` ove utile).\
-   **Deduplica**: usare chiavi naturali (date + athleteId) e opzione
    `ordered:false` per saltare duplicati.

------------------------------------------------------------------------

## 8) Sicurezza & deployment

-   Per ora niente auth (ambiente locale).\
-   In futuro: NextAuth o JWT + ruoli (coach/atleta/admin).\
-   Upload salvato in `public/` (ambiente di sviluppo). In produzione:
    storage dedicato (S3/Blob) e firma URL.

------------------------------------------------------------------------

## 9) Roadmap MVP → v1

1.  **(Fatto)** Health check DB; Docker Mongo locale; tsconfig a posto.\
2.  **(In corso)** Upload screenshot API + pagina test.\
3.  **Recovery upsert** (API + form) con regole *reset / scelta unica /
    purge pending*.\
4.  **Session upsert** (API + editor blocchi).\
5.  **Home minimale** e navigazione basica.\
6.  **Import dati storici** (script).\
7.  **Dashboard** (readonly): ultimi 14 giorni + indicatori (HRV, BB,
    readiness, DOMS).\
8.  **Refactor** verso `app/` router e layout globale.

------------------------------------------------------------------------

## 10) Struttura file proposta (cartella `pwa/`)

    lib/
      db.ts                  # getMongoClient() con cache
    pages/
      index.tsx              # home temporanea
      recovery.tsx           # form Recovery
      sessions.tsx           # form Session Log
      dev/upload-test/page.tsx
      api/
        _health/db.ts        # ping Mongo
        upload/screenshot.ts # upload immagini
        recovery/
          upsert.ts          # inserisci/aggiorna
          choose.ts          # scelta unica
          purge-pending.ts   # pulizia pending
        sessions/
          upsert.ts
    public/
      uploads/               # destinazione immagini locali

------------------------------------------------------------------------

## 11) Interfacce TypeScript (minime)

``` ts
// Recovery (semplificata)
export type RecoveryEntry = {
  _id?: string;
  athleteId?: string;
  date: string; // YYYY-MM-DD
  source: 'manual' | 'garmin';
  status?: 'saved' | 'pending';
  chosen?: boolean;
  fields: Record<string, any>; // compat 1:1 con JSON storici
  screenshotUrl?: string | null;
  createdAt?: string; updatedAt?: string;
};

// Session (semplificata)
export type SessionEntry = {
  _id?: string;
  date: string;
  type: string; // Palestra | Corsa | REST | ...
  blocks?: Array<{ type: string; exercise: string; details?: string; notes?: string }>;
  calories_equivalent?: number;
  notes?: string;
  source?: 'manual' | 'garmin';
  status?: 'saved' | 'pending';
  createdAt?: string; updatedAt?: string;
};
```

------------------------------------------------------------------------

## 12) Decisioni prese & motivazioni

-   **Import dinamico `mongodb`** per eliminare errori TS ambientali e
    permettere esecuzione solo lato server.
-   **Router `pages`** per sbloccare velocemente MVP (niente conflitti
    app/pages).
-   **Persistenza upload in `public/`** per semplicità in dev (da
    migrare a storage esterno in prod).

------------------------------------------------------------------------

## 13) Open points / to-clarify

-   [ ] Campi **obbligatori** minimi per Recovery UI (lista
    definitiva).\
-   [ ] Regola esatta "purge pending" (finestra temporale? per data o
    per duplicati?).\
-   [ ] Selezione *chosen* vale per recovery **e** session o solo
    recovery?\
-   [ ] Nome utente/`athleteId` multi-profilo (futuro) o singolo
    atleta?\
-   [ ] Dashboard: quali KPI prioritari (HRV mediana 7g, BB, readiness,
    DOMS heatmap...).\
-   [ ] Integrazione futura con **generazione sedute** (lettura
    `master_plan`, `running_parameters`, manuale) → endpoint
    `/api/plan/next-session`.

------------------------------------------------------------------------

## 14) Allegati di riferimento (file sorgente)

-   `recovery_log.json`, `session_log.json` (storico)\
-   `master_plan.json` (regole e fasi)\
-   `running_parameters.json` (zone HR)\
-   Manuale operativo & profilo atleta

------------------------------------------------------------------------

## 15) Definition of Done (MVP)

-   [ ] `/api/upload/screenshot` salva e ritorna URL; pagina test ok.\
-   [ ] `/api/recovery/upsert` funziona (insert + update) e **reset UI**
    dopo `ok:true`.\
-   [ ] `/api/recovery/choose` garantisce **una scelta per data**;
    `/purge-pending` rimuove duplicati non scelti.\
-   [ ] `/api/sessions/upsert` operativo.\
-   [ ] Home con link e navigazione base.\
-   [ ] Script import JSON storico → MongoDB.

------------------------------------------------------------------------

### Note finali

Questo canvas funge da **singola fonte di verità** per il MVP.
Aggiornare versione e "Definition of Done" a ogni iterazione.
