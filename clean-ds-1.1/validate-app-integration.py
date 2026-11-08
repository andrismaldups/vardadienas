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
theme_bootstrap = (root / "clean-ds-1.1/theme-bootstrap.js").read_text(encoding="utf-8")
check("document.body.classList.toggle('ds-app',active)" in theme_bootstrap,
      "Opt-in DS class toggle absent")
check("document.body.dataset.mode" in theme_bootstrap, "Light/dark mode sync absent")
for retired in ("lavender", "nature-d3", "water-j1"):
    check(f'name="designStyle" value="{retired}"' not in app, f"Retired theme still offered: {retired}")
check("['classic','festive-s1','ds11']" in theme_bootstrap, "Retired theme persisted in bootstrap allowlist")
check('value="classic"' in app, "Existing classic option absent")
guard_path = "clean-ds-1.1/isolation-guard.js"
guard = (root / guard_path).read_text(encoding="utf-8") if (root / guard_path).is_file() else ""
check(f'src="{guard_path}"' in app, "Design test isolation script not loaded")
check("window.DESIGN_TEST_ISOLATED=true" in guard, "Design test API isolation absent")
check("protectedOrigin=" in guard, "Protected push origin interception absent")
check(app.find(f'src="{guard_path}"') < app.find('src="clean-ds-1.1/app-core.js"'), "Isolation guard must precede application script")
check("const GREETING_SINCERE=" in (root / "clean-ds-1.1/app-core.js").read_text(encoding="utf-8"), "Application core content missing")
check(app.find('src="clean-ds-1.1/theme-bootstrap.js"') < app.find(f'src="{guard_path}"') < app.find('src="clean-ds-1.1/body-theme-init.js"'), "Early theme and isolation load order changed")
for script in ("sw-register.js", "reminder-time-picker.js", "push-design-guard.js",
               "theme-bootstrap.js", "body-theme-init.js", "app-core.js"):
    check(f'src="clean-ds-1.1/{script}"' in app, f"Extracted script not loaded: {script}")
for stylesheet in ("legacy-layout.css", "about-row-gap.css"):
    check(f'href="clean-ds-1.1/{stylesheet}"' in app, f"Extracted stylesheet not loaded: {stylesheet}")
check(app.find('src="clean-ds-1.1/sw-register.js"') < app.find('src="clean-ds-1.1/reminder-time-picker.js"') < app.find('src="clean-ds-1.1/push-design-guard.js"'), "Extracted scripts changed order")
push_guard = (root / "clean-ds-1.1/push-design-guard.js").read_text(encoding="utf-8")
check("Paziņojumi DESIGN TEST nav pieejami" in push_guard,
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
              "clean-ds-1.1/app-integration.css", "clean-ds-1.1/isolation-guard.js", "clean-ds-1.1/sw-register.js",
              "clean-ds-1.1/reminder-time-picker.js", "clean-ds-1.1/push-design-guard.js",
              "clean-ds-1.1/theme-bootstrap.js", "clean-ds-1.1/body-theme-init.js",
              "clean-ds-1.1/app-core.js", "clean-ds-1.1/legacy-layout.css",
              "clean-ds-1.1/about-row-gap.css", "assets/d3-rita-rasa.svg",
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

check('href="design-water-j1.css"' not in app, "Retired Sea theme CSS still loaded")
check('"./design-water-j1.css"' not in worker, "Retired Sea theme still precached")

check('html[data-design="lavender"] {' not in (root / "design-system.css").read_text(encoding="utf-8"), "Retired Lavender palette still active")

legacy_css = (root / "clean-ds-1.1/legacy-layout.css").read_text(encoding="utf-8")
check("/* TEST: Z3 Lavandas tonis" in legacy_css, "Legacy Z3 block temporarily restored for viewport safety")
check(".about-card .about-row-button" in legacy_css, "Shared about-row layout was accidentally removed")
check(".reminder-time-control" in legacy_css, "Shared reminder picker layout was accidentally removed")

# Architecture guard: business logic must not acquire theme-selection dependencies.
core_js = (root / "clean-ds-1.1/app-core.js").read_text(encoding="utf-8")
for forbidden in ("designStyle", "dataset.design", "dataset.theme", "data-design", "data-theme"):
    check(forbidden not in core_js, f"Functional core unexpectedly depends on visual theme: {forbidden}")
check('data-design' in app or 'designStyle' in app, "Theme selection UI missing")

check(app.count('data-ui-component="card"') >= 10, "Stable card component identity missing from application HTML")
