# AD-App — Project Vision & AI Architecture

**Versione:** 1.0  
**Data:** 2025-08-19  
**Fonte unificata:** Project Canvas + Manuale Operativo Davide 2025 + Profilo Sintetico + Running Parameters + Report Calorie

---

## 🎯 Obiettivo Finale
Realizzare una **PWA (Next.js 15 + MongoDB)** che digitalizzi e renda dinamico l’attuale workflow manuale di gestione allenamenti, trasformando l’AI in **parte integrante e attiva** del processo di:
- Pianificazione (o3),
- Esecuzione e feedback live (4o),
- Supervisione e aggiornamento regole/file (Auditor).

Il sistema deve:
- Centralizzare dati in MongoDB (compatibile 1:1 con i JSON storici),
- Consentire inserimento e consultazione di **Recovery** e **Session Log**,
- Supportare upload screenshot/video e analisi tecnica,
- Garantire che ogni decisione sia allineata a **Manuale Operativo**, **Master Plan**, **Profilo Sintetico**, **Running Parameters**.

---

## 🚦 Ruoli AI

### 1. o3 — **Programmazione (Coach L3)**
- Legge in ordine: `recovery_log.json → session_log.json → master_plan.json → running_parameters.json → Manuale Operativo`.
- Genera **preview testuale** della seduta (blocchi, carichi, durata).
- Aspetta sempre l’**OK esplicito dell’atleta** prima di produrre `next_session.json`.
- Se mancano prerequisiti o ci sono errori nei file → risponde con **ERRORE** e non procede.
- Integra regole di rotazione (stimoli, formati WOD, skill).
- Rispetta logiche scarpe → Nimbus 27 (Z1–Z2), Magic Speed 4 (Z3–Z5).

### 2. 4o — **Feedback Live (Assistente tecnico)**
- Segue l’atleta **durante l’allenamento**.
- Spiega esercizi, cue tecnici, correzioni in real time.
- Riceve **video/foto brevi** e fornisce analisi immediata.
- Aggiorna `session_log.json` e `recovery_log.json` passo-passo.
  - Chiede sempre: DOMS, zone coinvolte, intensità, altri fastidi.
  - Applica semaforo (verde/giallo/rosso) come da Manuale.
- Adatta la seduta in corso (scalando carichi o sostituendo esercizi) se necessario.

### 3. Auditor — **Supervisore & Guida File Progetto**
- Custode di: `Manuale_Operativo`, `master_plan.json`, `Profilo_Sintetico`, `running_parameters.json`.
- Aggiorna i file quando:
  - cambiano obiettivi,
  - si raggiungono milestone,
  - varia il periodo dell’anno (Estate → Annual-Main),
  - aggiornamenti Garmin/parametri (VO₂max, HR max, peso).
- Garantisce coerenza tra regole e implementazioni.
- Supporta l’atleta nell’adattare e implementare nuove versioni dei file di governance.

---

## 🔁 Workflow Giornaliero (ideale)

1. **Mattina — Recovery**  
   - Atleta compila Recovery (UI o manuale).  
   - 4o aggiorna `recovery_log.json` dopo conferma DOMS/pain.  

2. **Programmazione — o3**  
   - Legge file in ordine (validazione prerequisiti).  
   - Propone preview della seduta.  
   - Attende OK → genera `next_session.json`.  

3. **Allenamento — 4o**  
   - Guida blocchi, fornisce correzioni, analizza video.  
   - Se emergono problemi → propone adattamenti.  

4. **Fine seduta**  
   - 4o aggiorna `session_log.json`.  
   - Se dolori persistenti → applica flusso “Conferma Dolore Risolto”.

5. **Periodicamente — Auditor**  
   - Verifica consistenza file.  
   - Aggiorna `master_plan.json` e `Manuale` se necessario.  
   - Integra nuove skill/parametri.  

---

## 📦 Requisiti UI/DB

- **Recovery Page** → form giornaliero con screenshot upload, regola scelta unica, reset automatico.  
- **Session Page** → editor blocchi + upload file (.tcx/.csv/.fit), anteprima runMetrics, salvataggio in DB.  
- **Home Page** → link navigazione.  
- **Dev/Test Page** → upload screenshot già operativa.  
- **Logs** in DB:
  - `entries_recovery` (chiave naturale: data + athleteId),
  - `entries_session` (chiave naturale: data + type).

---

## 📈 Evoluzione
- MVP → Pagine Recovery/Session, API upsert, upload screenshot, import storico JSON.  
- v1 → Dashboard readonly (14 gg, HRV, readiness, DOMS).  
- v2 → Integrazione AI completa (o3, 4o, Auditor in-app).  
- v3 → Automazioni avanzate (generazione sedute, analisi trend, suggerimenti carichi).  

---

## ✅ Definition of Done (estesa)
- API operative: `/api/recovery/upsert`, `/api/recovery/choose`, `/api/recovery/purge-pending`, `/api/sessions/upsert`, `/api/upload/screenshot`.  
- UI con reset dopo salvataggio.  
- Una sola entry “chosen” per data.  
- Import storico completato.  
- AI integrata in 3 ruoli distinti e coerenti con i file guida.  
- File di progetto aggiornabili e mantenuti dall’Auditor.  

---

## 📌 Nota finale
Questo documento è la **fonte unica di verità** del progetto AD-App.  
Ogni nuova iterazione dovrà aggiornare qui versioni, regole e Definition of Done.

