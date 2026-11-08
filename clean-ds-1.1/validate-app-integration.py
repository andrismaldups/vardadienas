#!/usr/bin/env python3
"""Static safety checks for DS 1.1 integration into full VD Design.
Run from any directory: python3 clean-ds-1.1/validate-app-integration.py
Does not alter the app, storage, service workers or push subscriptions.
"""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
app = (root / "index.html").read_text(encoding="utf-8")
components = (root / "clean-ds-1.1/components.css").read_text(encoding="utf-8")
theme = (root / "clean-ds-1.1/d3-theme.css").read_text(encoding="utf-8")
bridge = (root / "clean-ds-1.1/app-integration.css").read_text(encoding="utf-8")
errors = []

def check(condition, message):
    if not condition:
        errors.append(message)

for path in ("clean-ds-1.1/components.css", "clean-ds-1.1/d3-theme.css",
             "clean-ds-1.1/app-integration.css"):
    check(f'href="{path}"' in app, f"Missing stylesheet link: {path}")

check('value="ds11"' in app, "DS 1.1 appearance option absent")
check("document.body.classList.toggle('ds-app',active)" in app,
      "Opt-in DS class toggle absent")
check("document.body.dataset.mode" in app, "Light/dark mode sync absent")
check('value="nature-d3"' in app, "Existing D3 option absent")
check('value="classic"' in app, "Existing classic option absent")
guard_path = "clean-ds-1.1/isolation-guard.js"
guard = (root / guard_path).read_text(encoding="utf-8") if (root / guard_path).is_file() else ""
check(f'src="{guard_path}"' in app, "Design test isolation script not loaded")
check("window.DESIGN_TEST_ISOLATED=true" in guard, "Design test API isolation absent")
check("protectedOrigin=" in guard, "Protected push origin interception absent")
check(app.find(f'src="{guard_path}"') < app.find('const GREETING_SINCERE='), "Isolation guard must precede application script")
check("Paziņojumi DESIGN TEST nav pieejami" in app,
      "Design test push activation lock absent")
check('id="calendar"' in app and 'id="dateInput"' in app,
      "Existing calendar or date search input absent")
check('id="greetingEmojiPanel"' in app, "Emoji picker absent")
check('id="settingsView"' in app and 'id="favoritesView"' in app,
      "Existing settings or favorites view absent")
check('html[data-design="ds11"] body.ds-app' in bridge,
      "Integration CSS is not scoped to opt-in DS mode")
check("data-design=\"nature-d3\"" not in bridge,
      "Integration CSS unexpectedly targets existing D3")
required = set(re.findall(r"var\((--ds-[a-z0-9-]+)", components))
defined = set(re.findall(r"(--ds-[a-z0-9-]+)\s*:", theme))
for missing in sorted(required - defined):
    errors.append(f"Undefined DS token: {missing}")
for mode in ("light", "dark"):
    check(f'html[data-design="ds11"][data-theme="{mode}"]' in theme,
          f"Missing D3 {mode} token set")
# Offline contract: all new styles and decorative assets must be precached.
worker = (root / "service-worker.js").read_text(encoding="utf-8")
for asset in ("clean-ds-1.1/components.css", "clean-ds-1.1/d3-theme.css",
              "clean-ds-1.1/app-integration.css", "clean-ds-1.1/isolation-guard.js", "assets/d3-rita-rasa.svg",
              "assets/d3-rita-gaisma.svg"):
    check((root / asset).is_file(), f"Offline asset missing on disk: {asset}")
    check(f'"./{asset}"' in worker, f"Offline asset absent from service worker: {asset}")
cache_version = re.search(r"const\s+CACHE_NAME\s*=\s*['\"]vardadienas-design-test-v(\d+)['\"]", worker)
check(cache_version is not None and int(cache_version.group(1)) >= 4,
      "Service worker cache version must be at least v4")
check('addEventListener("push"' not in worker and
      'addEventListener("notificationclick"' not in worker,
      "Design-only service worker must not register push listeners")
print(f"DS 1.1 integration: {len(required)} component tokens checked")
if errors:
    for issue in errors:
        print("FAIL:", issue)
    sys.exit(1)
print("PASS: static integration invariants")
print("NOTE: browser/iPhone functionality and Cloudflare deployment are NOT verified")
