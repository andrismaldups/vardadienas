#!/usr/bin/env python3
"""WCAG AA text contrast audit for the two independent reference palettes.
Usage: python3 clean-ds-1.1/contrast_audit.py
No external packages. Checks opaque hex colors, not rendered overlays/gradients.
"""
from pathlib import Path
import re
import sys

CSS = (Path(__file__).parent / "reference-theme.css").read_text(encoding="utf-8")
PAIRS = (
    ("text", "surface"), ("muted", "surface"), ("primary", "on-primary"),
    ("secondary-text", "secondary-bg"), ("selected-text", "selected-bg"),
    ("input-text", "input-bg"), ("placeholder", "input-bg"),
    ("popup-text", "popup-bg"), ("on-danger", "danger"),
    ("disabled-text", "disabled-bg"), ("link", "surface"),
)
MIN_RATIO = 4.5

def luminance(value):
    if not re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?", value):
        raise ValueError(f"Unsupported color format: {value}")
    h = value[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    rgb = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]

def ratio(a, b):
    x, y = luminance(a), luminance(b)
    return (max(x, y) + .05) / (min(x, y) + .05)

def main():
    errors = []
    for mode in ("light", "dark"):
        match = re.search(r'\.ds-app\[data-mode="' + mode + r'"\]\s*\{([^}]*)\}', CSS, re.S)
        if not match:
            errors.append(f"{mode}: missing palette")
            continue
        tokens = dict(re.findall(r"--ds-([a-z0-9-]+)\s*:\s*([^;\n}]+)", match.group(1)))
        tokens = {k: v.strip() for k, v in tokens.items()}
        print(f"\n{mode.upper()}")
        for foreground, background in PAIRS:
            try:
                value = ratio(tokens[foreground], tokens[background])
                ok = value >= MIN_RATIO
                print(f"{foreground:20s} / {background:20s} {value:5.2f}:1 {'PASS' if ok else 'FAIL'}")
                if not ok:
                    errors.append(f"{mode}: {foreground}/{background} {value:.2f}:1")
            except (KeyError, ValueError) as exc:
                errors.append(f"{mode}: {foreground}/{background}: {exc}")
    if errors:
        for error in errors:
            print("FAIL:", error)
        return 1
    print(f"\nPASS: {len(PAIRS)*2} opaque text contrast pairs >= {MIN_RATIO}:1")
    print("LIMIT: no browser rendering, focus ring, translucency or iPhone verification.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
