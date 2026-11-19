#!/usr/bin/env python3
"""Bump the Lektra version everywhere it has to agree.

One command replaces the old "remember to edit two files" checklist:

    python3 tools/bump-version.py            # 2.1 -> 2.2
    python3 tools/bump-version.py --set 2.3  # jump to 2.3
    python3 tools/bump-version.py --check    # are all files in sync?

Versions are plain numbers separated by dots. The last part is the one that
steps by default, so 2.1 -> 2.2 and 2.1.3 -> 2.1.4. A leading "v" is accepted
and dropped, so "v2.2" is the same version as "2.2".

It rewrites

    js/main.js      APP_BUILD            (shown in Settings -> More)
    sw.js           BUILD                (CACHE and V are derived from it)
    version.json    build                (the live update probe)
    index.html      css/style.css + js/*.js -> ?v=<version>
    js/scan.js      js/scan-worker.js    -> ?v=<version>
    README.md       the version label in the header and footer

Why every file: a new cache name alone is not enough. GitHub Pages sits behind
a CDN that may keep an old file for ~10 minutes, so each build must also have a
new *URL* for its code. A query string is the one thing the CDN cannot mistake
for the previous build. `--check` is safe to run before a push (or in CI).
"""

from pathlib import Path
import argparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent

VERSION_RE = r"\d+(?:\.\d+)*"
VERSION_TOKEN_RE = r"(?<![\w.])" + VERSION_RE + r"(?![\w.])"

MAIN_JS = "js/main.js"
SW_JS = "sw.js"
VERSION_JSON = "version.json"
INDEX_HTML = "index.html"
SCAN_JS = "js/scan.js"
README = "README.md"


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    path = ROOT / rel
    with path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def fail(message):
    print("error: " + message, file=sys.stderr)
    sys.exit(2)


def current_build():
    match = re.search(r'var\s+APP_BUILD\s*=\s*"([^"]+)"', read(MAIN_JS))
    if not match:
        fail('cannot find `var APP_BUILD = "<version>";` in ' + MAIN_JS)
    return match.group(1)


def parse_build(value):
    raw = str(value).strip()
    if raw.lower().startswith("v"):
        raw = raw[1:]
    if not re.fullmatch(VERSION_RE, raw):
        fail("version must be numbers separated by dots, such as 2.1 or 2.1.1")
    return raw


def next_build(build):
    parts = build.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def replace_once(text, pattern, replacement, label):
    new, count = re.subn(pattern, replacement, text)
    if count == 0:
        fail("cannot find " + label)
    return new


def version_index(html, build):
    html = replace_once(
        html,
        r'(href="css/style\.css)(?:\?v=[^"]*)?(")',
        lambda m: m.group(1) + "?v=" + build + m.group(2),
        'href="css/style.css" in ' + INDEX_HTML,
    )
    html = re.sub(
        r'(src="js/[^"?]+)(?:\?v=[^"]*)?(")',
        lambda m: m.group(1) + "?v=" + build + m.group(2),
        html,
    )
    return html


def version_scan(js, build):
    return re.sub(
        r'(new Worker\("js/scan-worker\.js)(?:\?v=[^"]*)?(")',
        lambda m: m.group(1) + "?v=" + build + m.group(2),
        js,
    )


def version_readme(text, old, build):
    # Only the version labels: the header and footer both carry one.
    return re.sub(
        r"(?<![\w.])" + re.escape(old) + r"(?![\w.])",
        build,
        text,
    )


def apply_build(build):
    changed = []
    old_build = current_build()

    def update(rel, new):
        try:
            old = read(rel)
        except FileNotFoundError:
            old = None
        if new != old:
            write(rel, new)
            changed.append(rel)

    update(
        MAIN_JS,
        replace_once(
            read(MAIN_JS),
            r'(var\s+APP_BUILD\s*=\s*")([^"]+)(")',
            lambda m: m.group(1) + build + m.group(3),
            "APP_BUILD in " + MAIN_JS,
        ),
    )
    update(
        SW_JS,
        replace_once(
            read(SW_JS),
            r'(var\s+BUILD\s*=\s*")([^"]+)(")',
            lambda m: m.group(1) + build + m.group(3),
            "BUILD in " + SW_JS,
        ),
    )
    update(INDEX_HTML, version_index(read(INDEX_HTML), build))
    update(SCAN_JS, version_scan(read(SCAN_JS), build))
    update(README, version_readme(read(README), old_build, build))

    version_file = '{\n  "build": "%s"\n}\n' % build
    update(VERSION_JSON, version_file)

    return changed


def collect_issues():
    issues = []
    build = current_build()

    sw = re.search(r'var\s+BUILD\s*=\s*"([^"]+)"', read(SW_JS))
    if not sw:
        issues.append(SW_JS + ": BUILD not found")
    elif sw.group(1) != build:
        issues.append(SW_JS + ": BUILD is " + sw.group(1) + ", APP_BUILD is " + build)

    try:
        probe = json.loads(read(VERSION_JSON))
        probe_build = probe.get("build", "")
        if probe_build != build:
            issues.append(VERSION_JSON + ": build is " + repr(probe_build) + ", APP_BUILD is " + build)
    except FileNotFoundError:
        issues.append(VERSION_JSON + ": missing (main.js uses it as the update probe)")
    except (ValueError, AttributeError) as exc:
        issues.append(VERSION_JSON + ": not valid JSON (" + str(exc) + ")")

    html = read(INDEX_HTML)
    css = re.search(r'href="css/style\.css(\?v=[^"]*)?"', html)
    if not css or css.group(1) != "?v=" + build:
        issues.append(INDEX_HTML + ": css/style.css is not versioned ?v=" + build)
    for match in re.finditer(r'src="(js/[^"?]+)(\?v=[^"]*)?"', html):
        if match.group(2) != "?v=" + build:
            issues.append(INDEX_HTML + ": " + match.group(1) + " is not versioned ?v=" + build)

    worker = re.search(r'new Worker\("js/scan-worker\.js(\?v=[^"]*)?"\)', read(SCAN_JS))
    if not worker or worker.group(1) != "?v=" + build:
        issues.append(SCAN_JS + ": scan-worker.js is not versioned ?v=" + build)

    labels = set(re.findall(VERSION_TOKEN_RE, read(README)))
    # The README's prose carries plenty of other numbers, so only check that the
    # version label is present at all; the header and footer copies are the ones
    # apply_build rewrites.
    if build not in labels:
        issues.append(
            README + ": version label " + build + " is missing"
        )

    return build, issues


def main():
    parser = argparse.ArgumentParser(description="Bump the Lektra version.")
    parser.add_argument("--set", metavar="VERSION", help="set an exact version, e.g. 2.2")
    parser.add_argument("--check", action="store_true", help="only verify that every file agrees")
    parser.add_argument("--quiet", action="store_true", help="print nothing on a successful bump")
    args = parser.parse_args()

    if args.check:
        build, issues = collect_issues()
        if issues:
            print("Version check failed (APP_BUILD is " + build + "):", file=sys.stderr)
            for issue in issues:
                print("  - " + issue, file=sys.stderr)
            print("\nRun: python3 tools/bump-version.py", file=sys.stderr)
            return 1
        if not args.quiet:
            print("All version markers agree on " + build + ".")
        return 0

    old = current_build()
    build = parse_build(args.set) if args.set else next_build(old)

    changed = apply_build(build)
    _, issues = collect_issues()
    if issues:
        print("Bumped " + old + " -> " + build + " but the result is inconsistent:", file=sys.stderr)
        for issue in issues:
            print("  - " + issue, file=sys.stderr)
        return 1

    if not args.quiet:
        print("Lektra " + old + " -> " + build)
        for rel in changed:
            print("  updated " + rel)
        if not changed:
            print("  (already at " + build + ")")
        print("\nNext: review the diff, then push. Open pages pick the build up")
        print("within a minute of connecting; offline launches keep the old cache")
        print("until the new one is fully downloaded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
