#!/usr/bin/env python3
"""Extract text and linearized OMML (Word Equation) formulas from a .docx file.

Uses only the standard library (zipfile + xml.etree), so it works without
python-docx. Word stores equations as OMML; this script turns them into a
readable one-line notation:

    fraction        -> (numerator)/(denominator)
    subscript       -> base_{sub}
    superscript     -> base^{sup}
    delimiter (m:d) -> honours the actual begin/end/separator characters
                       ({ } [ ] ( ) ;), so brackets stay balanced
    n-ary (sum)     -> ∑_{lower}^{upper}[body]
    radical         -> sqrt(body)
    matrix (m:m)    -> [row1 ; row2]  (Word uses 1-column matrices to break
                       long equations across lines)
    eq. array       -> case1 ⟂ case2

Usage:
    python3 tools/extract_omml.py FILE.docx            # full text, formulas inline
    python3 tools/extract_omml.py FILE.docx --formulas # numbered list of formulas only
    python3 tools/extract_omml.py FILE.docx --check    # formulas with unbalanced brackets
"""

import argparse
import sys
import zipfile
from xml.etree import ElementTree as ET

M = "{http://schemas.openxmlformats.org/officeDocument/2006/math}"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

THIN_SPACE = "\u2009"


def _child(e, name):
    c = e.find(M + name)
    return linearize(c) if c is not None else ""


def linearize(e):
    """Recursively convert an OMML (or plain w:) element into linear text."""
    tag = e.tag
    if tag in (M + "t", W + "t"):
        return e.text or ""
    if tag == M + "f":
        return "(" + _child(e, "num") + ")/(" + _child(e, "den") + ")"
    if tag == M + "sSub":
        return _child(e, "e") + "_{" + _child(e, "sub") + "}"
    if tag == M + "sSup":
        return _child(e, "e") + "^{" + _child(e, "sup") + "}"
    if tag == M + "sSubSup":
        return _child(e, "e") + "_{" + _child(e, "sub") + "}^{" + _child(e, "sup") + "}"
    if tag == M + "d":
        beg, end, sep = "(", ")", ";"
        pr = e.find(M + "dPr")
        if pr is not None:
            for name, default in (("begChr", beg), ("endChr", end), ("sepChr", sep)):
                c = pr.find(M + name)
                if c is not None:
                    val = c.get(M + "val", "")
                    if name == "begChr":
                        beg = val
                    elif name == "endChr":
                        end = val
                    else:
                        sep = val
        return beg + sep.join(linearize(x) for x in e.findall(M + "e")) + end
    if tag == M + "func":
        return _child(e, "fName") + "[" + _child(e, "e") + "]"
    if tag == M + "nary":
        chr_ = "∑"
        pr = e.find(M + "naryPr")
        if pr is not None and pr.find(M + "chr") is not None:
            chr_ = pr.find(M + "chr").get(M + "val", chr_)
        return chr_ + "_{" + _child(e, "sub") + "}^{" + _child(e, "sup") + "}[" + _child(e, "e") + "]"
    if tag == M + "rad":
        return "sqrt(" + _child(e, "e") + ")"
    if tag == M + "eqArr":
        return " ⟂ ".join(linearize(x) for x in e.findall(M + "e"))
    if tag == M + "m":
        return "[" + " ; ".join(linearize(x) for x in e.findall(M + "mr")) + "]"
    if tag == M + "mr":
        return ",".join(linearize(x) for x in e.findall(M + "e"))
    if tag.endswith("Pr"):
        return ""
    return "".join(linearize(c) for c in e)


def load_document(path):
    with zipfile.ZipFile(path) as z:
        return ET.fromstring(z.read("word/document.xml"))


def paragraphs(root):
    for p in root.iter(W + "p"):
        s = linearize(p).replace(THIN_SPACE, " ").strip()
        if s:
            yield s


def formulas(root, min_len=25):
    for om in root.iter(M + "oMath"):
        s = linearize(om).replace(THIN_SPACE, " ").strip()
        if len(s) >= min_len:
            yield s


def bracket_balance(s):
    pairs = {"(": ")", "[": "]", "{": "}"}
    return sum(s.count(o) - s.count(c) for o, c in pairs.items())


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("docx")
    ap.add_argument("--formulas", action="store_true", help="print only numbered formulas")
    ap.add_argument("--check", action="store_true", help="print only formulas with unbalanced brackets")
    ap.add_argument("--min-len", type=int, default=25, help="ignore formulas shorter than this")
    args = ap.parse_args(argv)

    root = load_document(args.docx)
    if args.formulas or args.check:
        for i, f in enumerate(formulas(root, args.min_len), 1):
            bal = bracket_balance(f)
            if args.check and bal == 0:
                continue
            suffix = f"   <<UNBALANCED {bal:+d}>>" if bal else ""
            print(f"{i:3d} {f}{suffix}")
    else:
        for p in paragraphs(root):
            print(p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
