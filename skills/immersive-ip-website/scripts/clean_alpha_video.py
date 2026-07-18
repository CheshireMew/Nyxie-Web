#!/usr/bin/env python3
"""Convert an alpha video to transparent WebM after clearing low-alpha canvas noise.

The source is never modified. Existing outputs are refused unless --overwrite is
explicitly supplied. The script analyzes the real alpha plane before and after
encoding, optionally writes a transparent WebP poster, and can save a JSON report.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Clear low-alpha full-canvas noise before converting a transparent "
            "MOV or other alpha master to VP9 WebM."
        )
    )
    parser.add_argument("input", type=Path, help="Source alpha video; it is never modified.")
    parser.add_argument("output", type=Path, help="Destination .webm file.")
    parser.add_argument(
        "--poster",
        type=Path,
        help="Optional transparent WebP poster generated from the cleaned WebM.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Optional JSON report containing source/output alpha measurements.",
    )
    parser.add_argument(
        "--alpha-threshold",
        type=int,
        default=8,
        help="Set pixels with 0 < alpha <= this 8-bit value to zero before encoding. Default: 8.",
    )
    parser.add_argument("--crf", type=int, default=26, help="VP9 CRF. Default: 26.")
    parser.add_argument(
        "--cpu-used",
        type=int,
        default=2,
        help="libvpx-vp9 speed/quality tradeoff. Default: 2.",
    )
    parser.add_argument(
        "--outer-ring-ratio",
        type=float,
        default=0.06,
        help="Image-edge width used for alpha diagnostics. Default: 0.06.",
    )
    parser.add_argument(
        "--corner-ratio",
        type=float,
        default=0.15,
        help="Corner block size used for alpha diagnostics. Default: 0.15.",
    )
    parser.add_argument("--ffmpeg", help="Path to ffmpeg; otherwise resolve it from PATH.")
    parser.add_argument("--ffprobe", help="Path to ffprobe; otherwise resolve it from PATH.")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow replacing output, poster, or report files that already exist.",
    )
    return parser.parse_args()


def resolve_binary(explicit: str | None, name: str, sibling_of: Path | None = None) -> Path:
    if explicit:
        candidate = Path(explicit).expanduser().resolve()
        if not candidate.is_file():
            raise SystemExit(f"{name} not found: {candidate}")
        return candidate

    if sibling_of is not None:
        suffix = sibling_of.suffix
        sibling = sibling_of.with_name(f"{name}{suffix}")
        if sibling.is_file():
            return sibling

    found = shutil.which(name)
    if not found:
        raise SystemExit(f"{name} was not found; pass --{name} with its full path")
    return Path(found).resolve()


def ensure_output_path(path: Path | None, overwrite: bool) -> None:
    if path is None:
        return
    if path.exists() and not overwrite:
        raise SystemExit(f"output already exists; pass --overwrite to replace it: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)


def run_checked(command: list[str], label: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown error"
        raise SystemExit(f"{label} failed:\n{detail}")
    return result


def probe_video(ffprobe: Path, path: Path) -> dict[str, Any]:
    result = run_checked(
        [
            str(ffprobe),
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_frames:stream_tags=alpha_mode:format=duration",
            "-of",
            "json",
            str(path),
        ],
        f"probing {path.name}",
    )
    payload = json.loads(result.stdout)
    streams = payload.get("streams") or []
    if not streams:
        raise SystemExit(f"no video stream found: {path}")
    stream = streams[0]
    return {
        "codec_name": stream.get("codec_name"),
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "pix_fmt": stream.get("pix_fmt"),
        "r_frame_rate": stream.get("r_frame_rate"),
        "nb_frames": stream.get("nb_frames"),
        "duration": float((payload.get("format") or {}).get("duration") or 0.0),
        "alpha_mode": (stream.get("tags") or {}).get("ALPHA_MODE")
        or (stream.get("tags") or {}).get("alpha_mode"),
    }


def decoder_args(codec_name: str | None) -> list[str]:
    # FFmpeg's native VP9 decoder can omit WebM's separate alpha stream.
    return ["-c:v", "libvpx-vp9"] if codec_name == "vp9" else []


def count_flags(data: bytes | bytearray, table: bytes) -> int:
    return bytes(data).translate(table).count(1)


def region_bytes(
    frame: bytes,
    width: int,
    height: int,
    outer_ring_ratio: float,
    corner_ratio: float,
) -> tuple[bytearray, bytearray]:
    border = max(1, min(width // 2, height // 2, round(min(width, height) * outer_ring_ratio)))
    corner_width = max(1, min(width // 2, round(width * corner_ratio)))
    corner_height = max(1, min(height // 2, round(height * corner_ratio)))

    outer = bytearray()
    outer.extend(frame[: border * width])
    outer.extend(frame[(height - border) * width :])
    for y in range(border, height - border):
        row_start = y * width
        outer.extend(frame[row_start : row_start + border])
        outer.extend(frame[row_start + width - border : row_start + width])

    corners = bytearray()
    rows = list(range(corner_height)) + list(range(height - corner_height, height))
    for y in rows:
        row_start = y * width
        corners.extend(frame[row_start : row_start + corner_width])
        corners.extend(frame[row_start + width - corner_width : row_start + width])
    return outer, corners


def analyze_alpha(
    ffmpeg: Path,
    path: Path,
    probe: dict[str, Any],
    threshold: int,
    outer_ring_ratio: float,
    corner_ratio: float,
) -> dict[str, Any]:
    width = probe["width"]
    height = probe["height"]
    frame_size = width * height
    low_table = bytes(1 if 1 <= value <= threshold else 0 for value in range(256))
    nonzero_table = bytes(1 if value > 0 else 0 for value in range(256))

    command = [
        str(ffmpeg),
        "-v",
        "error",
        *decoder_args(probe.get("codec_name")),
        "-i",
        str(path),
        "-map",
        "0:v:0",
        "-vf",
        "format=rgba,alphaextract",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "gray",
        "-",
    ]
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdout is None or process.stderr is None:
        raise SystemExit(f"could not read alpha plane: {path}")

    totals = {
        "frames": 0,
        "pixels": 0,
        "low_alpha_pixels": 0,
        "nonzero_pixels": 0,
        "outer_pixels": 0,
        "outer_low_alpha_pixels": 0,
        "outer_nonzero_pixels": 0,
        "corner_pixels": 0,
        "corner_low_alpha_pixels": 0,
        "corner_nonzero_pixels": 0,
    }

    while True:
        frame = process.stdout.read(frame_size)
        if not frame:
            break
        if len(frame) != frame_size:
            process.kill()
            raise SystemExit(f"partial alpha frame while reading {path.name}")

        outer, corners = region_bytes(frame, width, height, outer_ring_ratio, corner_ratio)
        totals["frames"] += 1
        totals["pixels"] += len(frame)
        totals["low_alpha_pixels"] += count_flags(frame, low_table)
        totals["nonzero_pixels"] += count_flags(frame, nonzero_table)
        totals["outer_pixels"] += len(outer)
        totals["outer_low_alpha_pixels"] += count_flags(outer, low_table)
        totals["outer_nonzero_pixels"] += count_flags(outer, nonzero_table)
        totals["corner_pixels"] += len(corners)
        totals["corner_low_alpha_pixels"] += count_flags(corners, low_table)
        totals["corner_nonzero_pixels"] += count_flags(corners, nonzero_table)

    stderr = process.stderr.read().decode("utf-8", errors="replace").strip()
    return_code = process.wait()
    if return_code != 0:
        raise SystemExit(f"alpha analysis failed for {path.name}:\n{stderr}")
    if totals["frames"] == 0:
        raise SystemExit(f"no decoded frames while analyzing alpha: {path}")

    def percentage(count: int, total: int) -> float:
        return round(100.0 * count / total, 6) if total else 0.0

    totals.update(
        {
            "transparent_pixels": totals["pixels"] - totals["nonzero_pixels"],
            "transparent_pct": percentage(
                totals["pixels"] - totals["nonzero_pixels"], totals["pixels"]
            ),
            "low_alpha_pct": percentage(totals["low_alpha_pixels"], totals["pixels"]),
            "outer_low_alpha_pct": percentage(
                totals["outer_low_alpha_pixels"], totals["outer_pixels"]
            ),
            "outer_nonzero_pct": percentage(
                totals["outer_nonzero_pixels"], totals["outer_pixels"]
            ),
            "corner_low_alpha_pct": percentage(
                totals["corner_low_alpha_pixels"], totals["corner_pixels"]
            ),
            "corner_nonzero_pct": percentage(
                totals["corner_nonzero_pixels"], totals["corner_pixels"]
            ),
        }
    )
    return totals


def encode_webm(
    ffmpeg: Path,
    source: Path,
    output: Path,
    threshold: int,
    crf: int,
    cpu_used: int,
    overwrite: bool,
) -> None:
    alpha_filter = (
        "[0:v]format=rgba,split=2[base][alpha_source];"
        f"[alpha_source]alphaextract,lut=y='if(lte(val,{threshold}),0,val)'[clean_alpha];"
        "[base][clean_alpha]alphamerge,format=yuva420p[out]"
    )
    command = [
        str(ffmpeg),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y" if overwrite else "-n",
        "-i",
        str(source),
        "-filter_complex",
        alpha_filter,
        "-map",
        "[out]",
        "-an",
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        str(crf),
        "-deadline",
        "good",
        "-cpu-used",
        str(cpu_used),
        "-row-mt",
        "1",
        "-auto-alt-ref",
        "0",
        "-metadata:s:v:0",
        "alpha_mode=1",
        str(output),
    ]
    run_checked(command, f"encoding {output.name}")


def write_poster(ffmpeg: Path, webm: Path, poster: Path, overwrite: bool) -> None:
    run_checked(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y" if overwrite else "-n",
            "-c:v",
            "libvpx-vp9",
            "-i",
            str(webm),
            "-frames:v",
            "1",
            "-c:v",
            "libwebp",
            "-lossless",
            "1",
            "-compression_level",
            "6",
            "-quality",
            "100",
            str(poster),
        ],
        f"creating poster {poster.name}",
    )


def main() -> None:
    args = parse_args()
    source = args.input.expanduser().resolve()
    output = args.output.expanduser().resolve()
    poster = args.poster.expanduser().resolve() if args.poster else None
    report_path = args.report.expanduser().resolve() if args.report else None

    if not source.is_file():
        raise SystemExit(f"input video not found: {source}")
    if output.suffix.lower() != ".webm":
        raise SystemExit("output must use the .webm extension")
    if poster and poster.suffix.lower() != ".webp":
        raise SystemExit("--poster must use the .webp extension")
    if report_path and report_path.suffix.lower() != ".json":
        raise SystemExit("--report must use the .json extension")
    paths = [source, output, *(path for path in (poster, report_path) if path is not None)]
    if len(paths) != len(set(paths)):
        raise SystemExit("input, output, poster, and report must use different paths")
    if not 0 <= args.alpha_threshold <= 254:
        raise SystemExit("--alpha-threshold must be between 0 and 254")
    if not 0 <= args.crf <= 63:
        raise SystemExit("--crf must be between 0 and 63")
    if not 0 <= args.cpu_used <= 8:
        raise SystemExit("--cpu-used must be between 0 and 8")
    if not 0 < args.outer_ring_ratio <= 0.25:
        raise SystemExit("--outer-ring-ratio must be greater than 0 and no more than 0.25")
    if not 0 < args.corner_ratio <= 0.5:
        raise SystemExit("--corner-ratio must be greater than 0 and no more than 0.5")

    ffmpeg = resolve_binary(args.ffmpeg, "ffmpeg")
    ffprobe = resolve_binary(args.ffprobe, "ffprobe", sibling_of=ffmpeg)
    ensure_output_path(output, args.overwrite)
    ensure_output_path(poster, args.overwrite)
    ensure_output_path(report_path, args.overwrite)

    source_probe = probe_video(ffprobe, source)
    source_alpha = analyze_alpha(
        ffmpeg,
        source,
        source_probe,
        args.alpha_threshold,
        args.outer_ring_ratio,
        args.corner_ratio,
    )
    if source_alpha["transparent_pixels"] == 0:
        raise SystemExit(
            "the decoded source contains no transparent pixels; check the source file and alpha decoder"
        )

    encode_webm(
        ffmpeg,
        source,
        output,
        args.alpha_threshold,
        args.crf,
        args.cpu_used,
        args.overwrite,
    )
    output_probe = probe_video(ffprobe, output)
    output_alpha = analyze_alpha(
        ffmpeg,
        output,
        output_probe,
        args.alpha_threshold,
        args.outer_ring_ratio,
        args.corner_ratio,
    )
    if output_alpha["transparent_pixels"] == 0:
        raise SystemExit(
            "the output decoded as fully opaque; verify that ffmpeg includes libvpx-vp9 alpha support"
        )
    if source_alpha["frames"] != output_alpha["frames"]:
        raise SystemExit(
            f"frame count changed: source={source_alpha['frames']} output={output_alpha['frames']}"
        )

    if poster:
        write_poster(ffmpeg, output, poster, args.overwrite)

    warnings: list[str] = []
    source_corner = source_alpha["corner_low_alpha_pct"]
    output_corner = output_alpha["corner_low_alpha_pct"]
    if output_corner > 2.0 and output_corner > source_corner * 0.2:
        warnings.append(
            "low-alpha coverage remains high in the output corners; inspect the real page background "
            "before raising the threshold because genuine effects may touch the frame edge"
        )
    if abs(source_probe["duration"] - output_probe["duration"]) > 0.05:
        warnings.append("source and output duration differ by more than 0.05 seconds")

    report = {
        "ok": True,
        "input": str(source),
        "output": str(output),
        "poster": str(poster) if poster else None,
        "alpha_threshold": args.alpha_threshold,
        "source_probe": source_probe,
        "output_probe": output_probe,
        "source_alpha": source_alpha,
        "output_alpha": output_alpha,
        "warnings": warnings,
        "visual_acceptance_required": True,
    }
    if report_path:
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit(130) from None
    except BrokenPipeError:
        sys.stderr.close()
