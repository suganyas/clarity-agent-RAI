# Launching a browser with CDP

The v1 CLI requires Edge or Chrome to already be running with a local Chrome DevTools Protocol endpoint. Edge is the default; Chrome is supported if that is where you normally sign in to Teams. Safari will not work because it does not expose the required CDP endpoint.

## Edge launch examples

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

## Chrome equivalents

Use the same flags with the Chrome executable/app name for your platform:

```text
macOS app name: /Applications/Google Chrome.app
Windows executable: chrome
Linux executable: google-chrome
```

## Endpoint selection

Precedence:

1. `--cdp-endpoint <url>`
2. `TEAMS_CDP_ENDPOINT`
3. `http://127.0.0.1:9222`

Example:

```bash
npm run --silent cli -- status --cdp-endpoint http://127.0.0.1:9222
```

## Troubleshooting

- `CDP_UNREACHABLE`: The selected browser is not running with remote debugging, the port is wrong, or another process owns the port.
- `TEAMS_TAB_MISSING`: CDP is reachable but no Teams tab was found.
- `Meeting active: no`: Teams is open, but meeting controls were not detected.
- Safari selected: use Edge or Chrome instead; Safari does not provide the CDP endpoint this CLI needs.

Do not paste or store cookies, tokens, authorization headers, or raw Teams network payloads while debugging.
