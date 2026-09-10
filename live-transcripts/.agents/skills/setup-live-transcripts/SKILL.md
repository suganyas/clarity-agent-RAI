---
name: setup-live-transcripts
description: Walk a user through launching Microsoft Edge or Google Chrome under local CDP control, joining a Teams meeting, enabling live captions, running the recorder, and validating NDJSON output.
---

# setup-live-transcripts

Use this skill when the user asks for `/setup-live-transcripts`, wants help starting live caption capture, or is setting up this repo for a Teams call for the first time.

## Goal

Guide the user end-to-end until the CLI is attached to a CDP-controlled Edge or Chrome profile and producing valid NDJSON transcript events under `scratch/`.

## Ground rules

- Keep the user in control of browser actions, Teams sign-in, meeting join, and live captions enablement.
- Do not ask the user to paste transcript content into chat.
- Use `scratch/` for recordings and debug output; it is intentionally gitignored.
- Ask which browser the user wants to use before launching anything. Edge is the default, Chrome is supported, and Safari will not work because it does not expose the Chrome DevTools Protocol endpoint this CLI uses.
- Ask which browser profile the user wants to use before launching the CDP-controlled browser. Prefer the isolated CDP profile unless the user needs an existing signed-in profile.
- Use the user's actual repository root in commands. Do not hard-code local paths from another machine.
- Ask one question at a time. Wait for confirmation before moving from browser setup to meeting setup, and from meeting setup to recorder validation.

## Walkthrough

1. Confirm prerequisites are installed from the repo root:

   ```bash
   npm install
   just check
   ```

   If `just` is missing, ask the user whether they want to install it with their operating system package manager before proceeding. If they say yes, ask which package manager they use, then run the matching install command. Do not assume Homebrew or any specific package manager.

   Common examples:

   ```text
   macOS: brew install just
   Windows PowerShell: winget install Casey.Just
   Ubuntu/Debian: sudo apt install just
   Fedora: sudo dnf install just
   Arch: sudo pacman -S just
   ```

   If they say no, stop and explain that the walkthrough commands use `just`; they can either install it later or manually translate the recipes from the `justfile`.

2. Ask which browser and profile the user wants to use:

   - Browser: Edge is the default; Chrome is supported if that is where the user normally signs in to Teams.
   - Do not use Safari. It will not work because the CLI needs a CDP endpoint.
   - Isolated profile such as `scratch/edge-cdp-profile` or `scratch/chrome-cdp-profile`: recommended for predictable CDP setup, but the user may need to sign in again.
   - Existing profile such as `Default` or `Profile 1`: useful when Teams is already signed in, but the selected browser must be fully quit first and relaunched with CDP flags.

   If the user is unsure, start with Edge and the isolated `scratch/edge-cdp-profile`.

3. Ask the user to fully quit the selected browser if it is already open, then launch the selected CDP-controlled browser profile.

   For the recommended isolated scratch profile, use the command for the user's platform.

   macOS:

   ```bash
   open -a "/Applications/Microsoft Edge.app" --args \
     --remote-debugging-port=9222 \
     --user-data-dir="$PWD/scratch/edge-cdp-profile" \
     "https://teams.cloud.microsoft/"
   ```

   Windows PowerShell:

   ```powershell
   Start-Process msedge -ArgumentList '--remote-debugging-port=9222', "--user-data-dir=$PWD\scratch\edge-cdp-profile", 'https://teams.cloud.microsoft/'
   ```

   Linux:

   ```bash
   microsoft-edge \
     --remote-debugging-port=9222 \
     --user-data-dir="$PWD/scratch/edge-cdp-profile" \
     "https://teams.cloud.microsoft/"
   ```

   Chrome equivalents:

   ```text
   macOS app name: /Applications/Google Chrome.app
   Windows executable: chrome
   Linux executable: google-chrome
   Isolated profile directory: scratch/chrome-cdp-profile
   ```

   For an existing browser profile, replace `Default` with the profile the user chose and use the selected browser executable.

   macOS:

   ```bash
   open -a "/Applications/Microsoft Edge.app" --args \
     --remote-debugging-port=9222 \
     --profile-directory=Default \
     "https://teams.cloud.microsoft/"
   ```

   Windows PowerShell:

   ```powershell
   Start-Process msedge -ArgumentList '--remote-debugging-port=9222', '--profile-directory=Default', 'https://teams.cloud.microsoft/'
   ```

   Linux:

   ```bash
   microsoft-edge \
     --remote-debugging-port=9222 \
     --profile-directory=Default \
     "https://teams.cloud.microsoft/"
   ```

4. Have the user sign in to Teams in that CDP-controlled browser window if needed.

5. Verify the CLI can see the CDP browser and Teams:

   ```bash
   npm run --silent cli -- status
   ```

   Healthy enough to proceed means CDP is reachable and a Teams tab is found. If no Teams tab is found, first confirm the user is looking at the browser window launched by the command above, not another existing non-CDP browser window.

6. If the wrong profile opened, help the user recover:

   - Ask the user what they see: signed out, wrong account, wrong tenant, or no Teams tab.
   - If they need a different existing profile, have them fully quit the selected browser and rerun the existing-profile launch command with the correct `--profile-directory` value.
   - If they do not know the profile directory name, have them open `edge://version` or `chrome://version` in the profile that works normally and copy only the final profile directory name from the `Profile path` value, such as `Default`, `Profile 1`, or `Profile 2`.
   - If profile selection remains confusing, switch back to the isolated scratch profile launch command for the selected browser and have the user sign in there.

7. Ask the user to join the Teams call in the CDP-controlled browser window.

8. Ask the user to enable live captions in Teams. Use the Teams meeting menu and choose the live captions option. Continue only after live captions are visibly updating in the meeting UI.

9. Ask the user to open a new terminal window or tab, keep the Teams meeting visible beside it, change to their repo root, and run the recorder:

   ```text
   cd <repo-root>
   just record-transcript-watch
   ```

   Do not run this as a background job. The user should keep this terminal visible so they can see the `saving transcript to ...` path and the parsed event names as the meeting continues. The command writes to the next available `scratch/NNN-transcript.ndjson` file and prints each parsed event type to the terminal.

10. Validate that NDJSON is being produced:

   - The terminal should first print `saving transcript to scratch/NNN-transcript.ndjson`.
   - After someone speaks and Teams updates live captions, the terminal should print `transcript`, `partial`, or `correction` event names.
   - The output file should contain one valid JSON object per line.
   - At least one event should include transcript text. A file containing only `unavailable`, `error`, or `end` is not a successful setup.

   Useful validation command from the repo root:

   ```bash
   node -e "const fs=require('node:fs'); const path=require('node:path'); const dir='scratch'; const files=fs.readdirSync(dir).filter(f=>f.endsWith('-transcript.ndjson')).map(f=>path.join(dir,f)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs); if(!files.length) throw new Error('no transcript files found'); const f=files[0]; const lines=fs.readFileSync(f,'utf8').trim().split(/\n/).filter(Boolean); console.log(f); console.log(lines.slice(-5).join('\n')); const events=lines.map((l,i)=>{try{return JSON.parse(l)}catch(e){throw new Error('invalid JSON on line '+(i+1)+': '+e.message)}}); const textEvents=events.filter(e=>['transcript','partial','correction'].includes(e.event)&&typeof e.text==='string'&&e.text.trim()); if(!textEvents.length) throw new Error('no transcript text events found'); for(const e of events){ if(e.schemaVersion!==1) throw new Error('unexpected schemaVersion'); if(typeof e.sequence!=='number') throw new Error('missing sequence'); if(typeof e.timestamp!=='string') throw new Error('missing timestamp'); if(typeof e.event!=='string') throw new Error('missing event'); } console.log('valid ndjson: '+events.length+' events, '+textEvents.length+' transcript text events in '+f)"
   ```

   This uses Node instead of shell-specific `ls`/`tail` commands, so it works from Bash, zsh, and PowerShell. It validates parseability, required event metadata, and presence of real transcript text. It prints only the latest file path, the last five raw events, and the validation summary; do not paste meeting content into chat.

## Troubleshooting prompts

- `CDP_UNREACHABLE`: The selected browser was not launched with `--remote-debugging-port=9222`, or another process is using the port. Quit the browser and relaunch the CDP command.
- `TEAMS_TAB_MISSING`: The CDP profile is running, but Teams is not open in that profile. Confirm the user is using the CDP-launched browser window, then open `https://teams.cloud.microsoft/` in that same window.
- Safari selected: Explain that Safari will not work because this CLI attaches through Chrome DevTools Protocol. Ask the user to choose Edge or Chrome.
- Wrong account/profile: Ask whether they want to relaunch with a different existing profile or use the isolated scratch profile. For existing profiles, use `edge://version` or `chrome://version` in the working normal profile to identify the final profile directory name, then quit the browser and relaunch with `--profile-directory=<name>`.
- `Meeting active: no`: Join the meeting in the CDP-controlled browser window and make sure meeting controls are visible.
- NDJSON file exists but validation says `no transcript text events found`: the recorder ran, but did not observe usable caption text. Confirm Teams live captions are visibly updating in the CDP-controlled browser window.
- No NDJSON events after speaking: Confirm Teams live captions are visibly updating. If they are, run `just dump-raw-captions 30000` and inspect `scratch/raw-captions.ndjson` locally without pasting meeting content into chat.

## Completion criteria

The setup is complete when `just record-transcript-watch` writes a `scratch/*-transcript.ndjson` file, `transcript`/`partial`/`correction` event names appear in the terminal during live speech, and the NDJSON validation command prints `valid ndjson` with at least one transcript text event.
