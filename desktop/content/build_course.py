#!/usr/bin/env python3
"""Builds src/course-data.js (the English classes) and src/dict-data.js (offline dictionary) from content/course/*.json."""
import json, glob, os, sys
here = os.path.dirname(os.path.abspath(__file__)); src = os.path.join(here, "..", "src")
classes = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(here, "course", "[0-9]*.json")))]
classes.sort(key=lambda c: c["n"])
nums = [c["n"] for c in classes]
if len(set(nums)) != len(nums): sys.exit(f"duplicate class numbers: {nums}")
open(os.path.join(src, "course-data.js"), "w", encoding="utf-8").write("const COURSE = " + json.dumps(classes, ensure_ascii=False, separators=(",", ":")) + ";\n")
d = os.path.join(here, "course", "dictionary.json")
words = json.load(open(d, encoding="utf-8")) if os.path.exists(d) else []
open(os.path.join(src, "dict-data.js"), "w", encoding="utf-8").write("const DICTW = " + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"{len(classes)} classes, {len(words)} dictionary words")
