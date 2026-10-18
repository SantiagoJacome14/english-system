#!/usr/bin/env python3
"""Validates content/course/*.json (the English classes). Usage: python3 content/validate_course.py [files...]"""
import json, sys, glob, os
here = os.path.dirname(os.path.abspath(__file__))
files = sys.argv[1:] or sorted(glob.glob(os.path.join(here, "course", "[0-9]*.json")))
bad = 0
def err(f, m):
    global bad; bad += 1; print(f"{os.path.basename(f)}: {m}")
for f in files:
    try: c = json.load(open(f, encoding="utf-8"))
    except Exception as e: err(f, f"invalid JSON: {e}"); continue
    for k in ["n", "block", "title", "emoji", "minutes", "goal", "sections", "vocab", "examples", "exercises", "speak", "tip"]:
        if k not in c: err(f, f"missing '{k}'")
    if bad and "sections" not in c: continue
    if not (2 <= len(c["sections"]) <= 8): err(f, "sections: 2 to 8")
    for s in c["sections"]:
        if "h" not in s or not (s.get("body") or s.get("table") or s.get("list")): err(f, f"section without content: {s.get('h')}")
        t = s.get("table")
        if t:
            if not all(len(r) == len(t["head"]) for r in t["rows"]): err(f, f"table rows must match head: {s['h']}")
    if not (8 <= len(c["vocab"]) <= 30): err(f, f"vocab: {len(c['vocab'])} (need 8 to 30)")
    for v in c["vocab"]:
        if not all(v.get(k) for k in ("en", "es", "ex")): err(f, f"vocab incomplete: {v}")
    if not (8 <= len(c["examples"]) <= 20): err(f, f"examples: {len(c['examples'])} (need 8 to 20)")
    ex = c["exercises"]
    if not (12 <= len(ex) <= 20): err(f, f"exercises: {len(ex)} (need 12 to 20)")
    kinds = {e.get("type") for e in ex}
    if not {"choice", "fill", "order", "translate"} <= kinds: err(f, f"use all 4 exercise types, found {kinds}")
    for i, e in enumerate(ex):
        t = e.get("type")
        if t == "choice":
            if not (2 <= len(e.get("options", [])) <= 4) or not isinstance(e.get("answer"), int) or not (0 <= e["answer"] < len(e["options"])): err(f, f"exercise {i+1} choice invalid")
            if "___" not in e.get("q", "") and "?" not in e.get("q", ""): err(f, f"exercise {i+1}: choice q should have ___ or be a question")
        elif t == "fill":
            if "___" not in e.get("q", "") or not e.get("answer") or not isinstance(e["answer"], list): err(f, f"exercise {i+1} fill invalid (q needs ___, answer is a list)")
        elif t == "order":
            w = e.get("words", [])
            if len(w) < 3 or " ".join(w).replace(" ", "").lower() != e.get("answer", "").replace(" ", "").lower() and sorted(w) != sorted(e.get("answer", "").split()): err(f, f"exercise {i+1} order: words must be the answer's words")
        elif t == "translate":
            if not e.get("es") or not isinstance(e.get("answer"), list) or not e["answer"]: err(f, f"exercise {i+1} translate invalid")
        else: err(f, f"exercise {i+1} unknown type {t}")
        if not e.get("why") and t != "order": err(f, f"exercise {i+1} needs a 'why'")
    if not (5 <= len(c["speak"]) <= 10): err(f, "speak: 5 to 10")
print("OK" if not bad else f"{bad} problem(s)")
sys.exit(1 if bad else 0)
