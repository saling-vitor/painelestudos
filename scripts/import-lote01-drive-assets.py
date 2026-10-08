#!/usr/bin/env python3
"""Import exact, size-verified brand assets from user's shared Google Drive folder.
Only intended for the Lote 01 work branch; never writes to main directly.
"""
import json
import os
import pathlib
import shutil
import sys
import tempfile
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "brand" / "topographic-editorial-v1"
MANIFEST = json.loads((ROOT / "scripts" / "lote-01-drive-assets.json").read_text())
assert len(MANIFEST) == 48, f"Expected 48 files, got {len(MANIFEST)}"


def valid(file_path, size, name):
    p = pathlib.Path(file_path)
    if not p.is_file() or p.stat().st_size != size:
        return False
    with p.open("rb") as f:
        head = f.read(100)
    if name.endswith(".png"):
        return head.startswith(b"\x5cx89PNG\x5cr\x5cn\x5cx1a\x5cn")
    if name.endswith(".ico"):
        return head.startswith(b"\x5cx00\x5cx00\x5cx01\x5cx00")
    if name.endswith(".svg"):
        return b"<svg" in head or b"<?xml" in head
    return True


def download_one(id, temp):
    # First try Google Drive's direct file endpoint, then gdown's confirmation handling.
    url = "https://drive.usercontent.google.com/download?" + urllib.parse.urlencode(
        {"id": id, "export": "download", "confirm": "t"}
    )
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=65) as src, open(temp, "wb") as dst:
            shutil.copyfileobj(src, dst)
    except Exception as e:
        print(f"  Direct endpoint failed: {type(e).__name__}", flush=True)


def run():
    import gdown
    already = 0
    copied = 0
    for idx, (name, file_id, size) in enumerate(MANIFEST, start=1):
        expected_size = int(size)
        target = ASSET_ROOT / name
        if target.is_file():
            if not valid(target, expected_size, name):
                raise RuntimeError(f"Existing asset differs from Drive size/magic: {name}")
            already += 1
            print(f"[{idx}/48] already verified: {name}", flush=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmpdir:
            temp = pathlib.Path(tmpdir) / "download"
            download_one(file_id, temp)
            if not valid(temp, expected_size, name):
                temp.unlink(missing_ok=True)
                out = gdown.download(id=file_id, output=str(temp), quiet=True)
                if not out or not valid(temp, expected_size, name):
                    actual = temp.stat().st_size if temp.is_file() else 0
                    raise RuntimeError(
                        f"Download failed / not public / wrong bytes: {name} "
                        f"(expected {expected_size}, got {actual})."
                    )
            shutil.copyfile(temp, target)
        copied += 1
        print(f"[{idx}/48] imported: {name} ({expected_size} bytes)", flush=True)

    missing = [name for name, _, size in MANIFEST
               if not valid(ASSET_ROOT / name, int(size), name)]
    if missing:
        raise RuntimeError("Unverified files: " + ", ".join(missing))
    print(f"COMPLETE: {already} existing + {copied} transferred = 48 validated assets")


if __name__ == "__main__":
    run()
