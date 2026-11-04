#!/usr/bin/env python3
"""Align remaining app class strings with the Dashboard type scale.

Skips the already verified dashboard, sales invoice list, and purchase invoice list,
plus marketing pages and printable invoice templates.
"""
from pathlib import Path
import re

ROOT = Path("/home/dell/Jaydeep/Billing_frontend/src")
SKIP_FILES = {
    ROOT / "app/page.tsx",
    ROOT / "app/sales/invoices/page.tsx",
    ROOT / "app/purchases/page.tsx",
}
SKIP_PARTS = (
    "/landing/",
    "/rojmek/",
    "/features/",
    "/intro/",
    "/login/",
    "dynamic-themed-invoice",
    "official-government",
    "invoice-live-preview",
    "invoice-settings-studio",
    "custom-theme-studio",
    "invoice-theme",
)

TITLE_SWAPS = (
    ("text-xl sm:text-2xl lg:text-[1.75rem] font-bold", "text-[22px] font-semibold"),
    ("text-xl sm:text-2xl lg:text-[1.65rem] font-bold", "text-[22px] font-semibold"),
    ("text-2xl sm:text-3xl font-semibold", "text-[22px] font-semibold"),
    ("text-2xl sm:text-3xl font-bold", "text-[22px] font-semibold"),
    ("text-xl sm:text-2xl font-bold", "text-[22px] font-semibold"),
    ("text-xl sm:text-2xl font-semibold", "text-[22px] font-semibold"),
    ("text-2xl font-bold", "text-[22px] font-semibold"),
    ("text-2xl font-semibold", "text-[22px] font-semibold"),
    ("text-xl font-bold", "text-[22px] font-semibold"),
    ("text-lg font-bold", "text-[22px] font-semibold"),
    ("text-base sm:text-lg font-semibold", "text-[22px] font-semibold"),
    ("text-base sm:text-lg font-bold", "text-[22px] font-semibold"),
    ("text-base font-bold", "text-[15px] font-semibold"),
    ("text-sm sm:text-base font-bold", "text-[15px] font-semibold"),
)

HEADING_COLORS = (
    "text-slate-900",
    "text-slate-800",
    "text-gray-900",
    "text-[#0F172A]",
    "text-[#1F2937]",
    "text-[#1A2E2B]",
    "text-[#202124]",
)

GLOBAL_SWAPS = (
    ("bg-[#0F172A] hover:bg-[#123B35]", "bg-[#1677E8] hover:bg-[#125CC0]"),
    ("hover:bg-[#123B35]", "hover:bg-[#125CC0]"),
    ("bg-[#123B35]", "bg-[#125CC0]"),
    ("active:bg-[#0D2A26]", "active:bg-[#0E4C9E]"),
    ("active:bg-[#020617]", "active:bg-[#0E4C9E]"),
    ("active:bg-[#B94B0A]", "active:bg-[#0E4C9E]"),
    ("border-[#E2E8E5]", "border-[#E2E8F0]"),
    ("border-[#E2E8E5]", "border-[#E2E8F0]"),
    ("text-[#1A2E2B]", "text-[#182230]"),
    ("text-[#202124]", "text-[#182230]"),
    ("shadow-saffron", "shadow-xs"),
    ("font-mono", "tabular-nums"),
)

CLASS_ATTR = re.compile(r'className="([^"]*)"')
TAG_RE = re.compile(r"<(h1|h2|h3|label|button|th|td|input|select|textarea|a|Link)\b", re.I)


def skip(path: Path) -> bool:
    if path in SKIP_FILES:
        return True
    text = str(path)
    return any(part in text for part in SKIP_PARTS)


def transform(tag: str, cls: str) -> str:
    tag = tag.lower()
    for a, b in GLOBAL_SWAPS:
        cls = cls.replace(a, b)

    if tag == "h1":
        for a, b in TITLE_SWAPS:
            cls = cls.replace(a, b)
        for color in HEADING_COLORS:
            cls = cls.replace(color, "text-[#182230]")
        cls = cls.replace("font-bold", "font-semibold")
    elif tag == "h2":
        cls = cls.replace("font-bold", "font-semibold")
        cls = re.sub(r"\btext-(?:2xl|xl|lg|base)\b", "text-[15px]", cls)
        for color in HEADING_COLORS:
            cls = cls.replace(color, "text-[#182230]")
    elif tag == "h3":
        cls = cls.replace("font-bold", "font-semibold")
        if "text-[15px]" not in cls and "text-[13px]" not in cls:
            cls = re.sub(r"\btext-(?:2xl|xl|lg|base|sm)\b", "text-[15px]", cls)
    elif tag == "label":
        cls = cls.replace("font-bold", "font-medium").replace("font-semibold", "font-medium")
        cls = re.sub(r"\btext-(?:xs|sm|base)\b", "text-[12px]", cls)
    elif tag == "th":
        cls = cls.replace("font-bold", "font-medium").replace("font-semibold", "font-medium")
        cls = re.sub(r"\btext-(?:\[10px\]|\[11px\]|xs|sm)\b", "text-[12px]", cls)
    elif tag == "td":
        cls = re.sub(r"\btext-(?:xs|sm)\b", "text-[13px]", cls)
        cls = cls.replace("font-bold", "font-medium")
    elif tag in ("input", "select", "textarea"):
        if any(token in cls for token in ("sr-only", "w-4", "h-4", "h-3", "w-3")):
            return cls
        cls = cls.replace("font-bold", "font-normal").replace("font-semibold", "font-normal")
        cls = re.sub(r"\btext-(?:xs|sm|base)\b", "text-[13px]", cls)
        if "text-[13px]" not in cls and not re.search(r"text-\[", cls):
            cls += " text-[13px] font-normal"
        if tag != "textarea" and not re.search(r"\bh-(?:8|9|10|11|12|\[)", cls):
            cls += " h-10"
    elif tag in ("button", "a", "link"):
        looks_like_control = any(
            token in cls for token in ("px-", "py-", "h-8", "h-9", "h-10", "inline-flex", "rounded")
        )
        if not looks_like_control:
            return cls
        cls = cls.replace("font-bold", "font-medium").replace("font-semibold", "font-medium")
        cls = cls.replace("text-xs sm:text-sm", "text-[13px]")
        cls = re.sub(r"\btext-xs\b", "text-[13px]", cls)
        cls = re.sub(r"\btext-sm\b", "text-[13px]", cls)
        icon_only = bool(re.search(r"(?:^|\s)p-[12](?:\s|$)", cls)) or bool(
            re.search(r"(?:^|\s)w-[789](?:\s|$)", cls)
        )
        if not re.search(r"\bh-(?:7|8|9|10|11|\[)", cls) and not icon_only:
            for old, new in (
                ("px-5 py-2.5", "h-9 px-3.5"),
                ("px-5 py-2", "h-9 px-3.5"),
                ("px-4 py-2.5", "h-9 px-3.5"),
                ("px-4 py-2", "h-9 px-3"),
                ("px-3.5 py-2", "h-9 px-3"),
                ("px-3.5 py-1.5", "h-9 px-3"),
                ("px-3 py-2", "h-9 px-3"),
                ("px-3 py-1.5", "h-9 px-3"),
            ):
                if old in cls:
                    cls = cls.replace(old, new, 1)
                    break
    return cls


def owner_tag(text: str, class_at: int) -> str | None:
    window_start = max(0, class_at - 800)
    window = text[window_start:class_at]
    tags = list(TAG_RE.finditer(window))
    if not tags:
        return None
    tag_match = tags[-1]
    between = window[tag_match.end() :].replace("=>", "").replace(">=", "")
    if ">" in between or "<" in between:
        return None
    if re.search(r'type="(checkbox|radio|file|hidden|range|color)"', between):
        return None
    return tag_match.group(1)


def process(text: str) -> str:
    def repl(match: re.Match) -> str:
        tag = owner_tag(text, match.start())
        if not tag:
            return match.group(0)
        cls = match.group(1)
        updated = transform(tag, cls)
        if updated == cls:
            return match.group(0)
        return f'className="{updated}"'

    return CLASS_ATTR.sub(repl, text)


def main() -> None:
    changed = 0
    files = 0
    for path in ROOT.rglob("*.tsx"):
        if skip(path):
            continue
        original = path.read_text(encoding="utf-8")
        updated = process(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            files += 1
            changed += sum(1 for a, b in zip(original.splitlines(), updated.splitlines()) if a != b)
            # count line diffs more honestly
    print(f"files={files}")


if __name__ == "__main__":
    main()
