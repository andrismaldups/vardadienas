#!/usr/bin/env python3
"""DS 1.1 static contract checker. Run: python3 clean-ds-1.1/validate.py
No external dependencies; does not alter application or user data.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
COMPONENTS = ROOT / "components.css"
THEMES = ROOT / "reference-theme.css"
GALLERY = ROOT / "gallery.html"
REQUIRED_COMPONENTS = {
    "C01": "ds-card", "C02": "ds-inset", "C03": "ds-button--primary",
    "C04": "ds-button", "C05": "ds-icon-button", "C06": "ds-choice",
    "C07": "ds-input", "C08": "ds-select", "C09": "ds-nav",
    "C10": "ds-list-row", "C11": "ds-status", "C12": "ds-link",
    "C13": "ds-popup", "C14": "ds-switch", "C15": "ds-textarea",
    "C16": "ds-day", "C17": "ds-button--danger", "C18": "ds-accordion",
}
# Simple token names are intentionally allowed to include role-specific variants.
TOKEN = re.compile(r"--ds-[a-z0-9-]+")
REFERENCE = re.compile(r"var\(\s*(--ds-[a-z0-9-]+)")
DECLARATION = re.compile(r"(--ds-[a-z0-9-]+)\s*:")
COLOR_LITERAL = re.compile(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(")

def fail(message, errors):
    errors.append(message)
    print("FAIL:", message)

def main():
    errors = []
    component_css = COMPONENTS.read_text(encoding="utf-8")
    theme_css = THEMES.read_text(encoding="utf-8")
    gallery = GALLERY.read_text(encoding="utf-8")
    referenced = set(REFERENCE.findall(component_css))
    if not referenced:
        fail("Component CSS contains no semantic token references", errors)
    if COLOR_LITERAL.search(re.sub(r"/\*.*?\*/", "", component_css, flags=re.S)):
        fail("Component CSS contains hardcoded color values", errors)
    if re.search(r"(?:^|[},])\s*(?:body|html|:root)\s*\{", re.sub(r"/\*.*?\*/", "", component_css, flags=re.S), flags=re.M):
        fail("Component CSS includes global selectors", errors)
    if re.search(r"\b(?:K1|Z3|D3|S1|J1-E)\b", component_css):
        fail("Component CSS references legacy themes", errors)

    # Separate modes; token values must be explicit in BOTH, not inherited.
    for mode in ("light", "dark"):
        match = re.search(r'\.ds-app\[data-mode=["\']' + mode + r'["\']\]\s*\{([^}]*)\}', theme_css, re.S)
        if not match:
            fail(f"Missing {mode} theme block", errors)
            continue
        declared = set(DECLARATION.findall(match.group(1)))
        missing = sorted(referenced - declared)
        if missing:
            fail(f"{mode}: missing component tokens: {', '.join(missing)}", errors)
        print(f"{mode}: {len(declared)} tokens declared; {len(referenced)} referenced by components")

    for number, class_name in REQUIRED_COMPONENTS.items():
        if "." + class_name not in component_css:
            fail(f"{number}: missing CSS class .{class_name}", errors)
        if 'class="' not in gallery or class_name not in gallery:
            fail(f"{number}: missing gallery sample .{class_name}", errors)

    # Detect accidentally importing the old style system into the clean gallery.
    if re.search(r'(?:href|src)\s*=\s*["\'][^"\']*(?:design-system\.css|design-system-v1\.css|index\.html)', gallery):
        fail("Gallery links legacy styles or application", errors)
    print(f"Component catalog: {len(REQUIRED_COMPONENTS)} entries checked")
    print("PASS: structural token contract" if not errors else f"FAIL: {len(errors)} issue(s)")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
