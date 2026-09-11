# Debug live caption capture

Use this runbook when a remote setup attaches to Edge or Chrome but the output looks wrong, for example:

- `just record-transcript-watch` prints only event names such as `transcript` or `correction`.
- The transcript file has no `text` fields.
- Speakers are missing or wrong.
- Captions duplicate, stall, or contain growing history.

## First check: event names are expected

`just record-transcript-watch` prints event names to the terminal and writes full NDJSON events to `scratch/NNN-transcript.ndjson`. Seeing only:

```text
transcript
correction
partial
```

does not mean the transcript text is missing. It means the watch command is showing categories while saving content to the file named in:

```text
saving transcript to scratch/NNN-transcript.ndjson
```

To view human-readable transcript output instead, run:

```bash
just stream-transcript 30000
```

To debug the recorded NDJSON without pasting meeting content into chat, continue below.

## Collect safe local evidence

Run these commands from the repo root on the machine connected to the Teams meeting.

1. Confirm the CLI can see the CDP browser and Teams:

   ```bash
   npm run --silent cli -- status
   npm run --silent cli -- status --json
   ```

2. Record a short watched stream and note the file path printed by the program:

   ```bash
   just record-transcript-watch "" 30000
   ```

3. Summarize the latest transcript file without printing meeting text:

   ```bash
   node -e "const fs=require('node:fs'); const path=require('node:path'); const dir='scratch'; const files=fs.readdirSync(dir).filter(f=>f.endsWith('-transcript.ndjson')).map(f=>path.join(dir,f)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs); if(!files.length) throw new Error('no transcript files found'); const f=files[0]; const lines=fs.readFileSync(f,'utf8').trim().split(/\n/).filter(Boolean); const events=lines.map((l,i)=>{try{return JSON.parse(l)}catch(e){throw new Error('invalid JSON on line '+(i+1)+': '+e.message)}}); const counts={}; let textEvents=0; let speakerEvents=0; let emptyTextEvents=0; for(const e of events){counts[e.event]=(counts[e.event]||0)+1; if(['transcript','partial','correction'].includes(e.event)){ if(typeof e.text==='string'&&e.text.trim()) textEvents++; else emptyTextEvents++; if(typeof e.speaker==='string'&&e.speaker.trim()) speakerEvents++; }} console.log(JSON.stringify({file:f,totalEvents:events.length,counts,textEvents,speakerEvents,emptyTextEvents,firstSequence:events[0]?.sequence,lastSequence:events.at(-1)?.sequence},null,2));"
   ```

4. Capture raw Teams caption DOM samples:

   ```bash
   just dump-raw-captions 30000
   ```

   This writes `scratch/raw-captions.ndjson`.

5. Summarize raw caption candidates without printing caption text:

   ```bash
   node -e "const fs=require('node:fs'); const f='scratch/raw-captions.ndjson'; const rows=fs.readFileSync(f,'utf8').trim().split(/\n/).filter(Boolean).map(JSON.parse); const byTid={}; let samples=0; let textCandidates=0; for(const row of rows){ for(const c of row.candidates??[]){ samples++; const key=c.dataTid||'(none)'; byTid[key]=(byTid[key]||0)+1; if(typeof c.text==='string'&&c.text.trim()) textCandidates++; }} console.log(JSON.stringify({file:f,rows:rows.length,candidates:samples,textCandidates,dataTidCounts:byTid},null,2));"
   ```

## What to share with the debugging agent

Share:

- Browser choice: Edge or Chrome.
- Operating system.
- Whether live captions are visibly updating in Teams.
- Output from `status` and `status --json`.
- The JSON summaries from steps 3 and 5.
- Whether `just stream-transcript 30000` shows human-readable text.

Do not share:

- Raw transcript lines.
- `scratch/*-transcript.ndjson`.
- `scratch/raw-captions.ndjson`.
- Cookies, tokens, authorization headers, or raw network payloads.

If the agent needs more detail, inspect the scratch files locally and describe structure without copying meeting content. Useful structure facts include selector names, `data-tid` values, whether candidate text is empty/non-empty, child counts, and whether speaker-like labels appear near caption nodes.

## Interpreting common results

| Symptom | Likely meaning | Next step |
|---------|----------------|-----------|
| Terminal prints `transcript` / `correction`, but summary shows `textEvents > 0` | Capture is working; watch mode is only showing event names. | Use `just stream-transcript 30000` for human text, or inspect the NDJSON file locally. |
| `textEvents = 0`, but raw summary has `textCandidates > 0` | CLI event extraction is losing text after raw DOM sees it. | Debug `src/adapters/teams/transcriptProbeAdapter.ts`. |
| Raw summary has `textCandidates = 0` while Teams visibly shows captions | Raw selector no longer matches Teams DOM. | Update the raw dump selector and probe selectors from local DOM structure. |
| `speakerEvents = 0`, but raw candidates show adjacent speaker-like labels | Speaker sibling heuristic needs updating. | Debug speaker extraction in the Teams adapter. |
| Many `correction` events and few final `transcript` events | Teams is rewriting live captions progressively. | Check dedupe/finalization behavior before changing selectors. |

