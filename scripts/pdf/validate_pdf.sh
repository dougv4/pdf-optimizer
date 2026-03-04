#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <target.pdf> [reference.pdf]"
  exit 1
fi

target_pdf="$1"
reference_pdf="${2:-}"

echo "== Basic checks =="
qpdf --show-npages "$target_pdf"
qpdf --check "$target_pdf" | head -n 8

echo
echo "== Structure checks =="
python3 - "$target_pdf" <<'PY'
import json
import subprocess
import sys

pdf = sys.argv[1]
j = json.loads(subprocess.check_output(["qpdf", "--json", pdf], text=True))

outlines = j.get("outlines", [])
stack = list(outlines)
count = 0
while stack:
    node = stack.pop()
    count += 1
    stack.extend(node.get("kids", []))

links = 0
for value in j["qpdf"][1].values():
    if isinstance(value, dict):
        d = value.get("value") or (value.get("stream") or {}).get("dict")
        if isinstance(d, dict) and d.get("/Subtype") == "/Link":
            links += 1

print(f"top_outlines={len(outlines)}")
print(f"total_outlines={count}")
print(f"links={links}")
PY

if [[ -n "$reference_pdf" ]]; then
  echo
  echo "== Text extraction comparison =="
  ref_chars=$(gs -q -dNOPAUSE -dBATCH -sDEVICE=txtwrite -sOutputFile=- "$reference_pdf" | wc -m | tr -d ' ')
  target_chars=$(gs -q -dNOPAUSE -dBATCH -sDEVICE=txtwrite -sOutputFile=- "$target_pdf" | wc -m | tr -d ' ')
  python3 - "$ref_chars" "$target_chars" <<'PY'
import sys
ref = int(sys.argv[1])
target = int(sys.argv[2])
delta = target - ref
pct = (target / ref - 1) * 100
print(f"reference_chars={ref}")
print(f"target_chars={target}")
print(f"delta_chars={delta}")
print(f"delta_pct={pct:.2f}")
PY
fi
