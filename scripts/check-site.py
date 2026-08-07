#!/usr/bin/env python3
"""Validate generated metadata and first-party links without external dependencies."""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self.has_description = False
        self.has_canonical = False
        self.is_hugo_page = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "meta" and values.get("name") == "description" and values.get("content"):
            self.has_description = True
        if tag == "meta" and values.get("name") == "generator" and values.get("content", "").startswith("Hugo"):
            self.is_hugo_page = True
        if tag == "link" and values.get("rel") == "canonical" and values.get("href"):
            self.has_canonical = True
        for attribute in ("href", "src"):
            if values.get(attribute):
                self.links.append(values[attribute] or "")


def resolves(root: Path, base_path: str, page: Path, raw_url: str) -> bool:
    parsed = urlsplit(raw_url)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return True
    path = unquote(parsed.path)
    if path.startswith(base_path):
        target = root / path[len(base_path):]
    elif path.startswith("/"):
        return True
    else:
        target = page.parent / path
    if not path.lstrip("/"):
        return True

    candidates = [target]
    if path.endswith("/"):
        candidates.append(target / "index.html")
    elif not Path(path).suffix:
        candidates.extend((target / "index.html", Path(f"{target}.html")))
    return any(candidate.exists() for candidate in candidates)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check-site.py <public-dir> <base-path>", file=sys.stderr)
        return 2

    root = Path(sys.argv[1]).resolve()
    base_path = "/" + sys.argv[2].strip("/") + "/"
    failures: list[str] = []
    pages = sorted(root.rglob("*.html"))

    for page in pages:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        relative = page.relative_to(root)
        if not parser.is_hugo_page:
            continue
        if not parser.has_description:
            failures.append(f"{relative}: missing meta description")
        if not parser.has_canonical:
            failures.append(f"{relative}: missing canonical link")
        for link in parser.links:
            if not resolves(root, base_path, page, link):
                failures.append(f"{relative}: unresolved link {link}")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1

    print(f"Validated {len(pages)} HTML pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
