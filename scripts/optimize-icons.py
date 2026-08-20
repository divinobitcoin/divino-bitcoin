from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/webdev-static-assets/divino-bitcoin-icon.png")
TARGETS = (
    Path("assets/images/icon.png"),
    Path("assets/images/splash-icon.png"),
    Path("assets/images/favicon.png"),
    Path("assets/images/android-icon-foreground.png"),
)


def main() -> None:
    with Image.open(SOURCE) as raw:
        image = raw.convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
        optimized = image.quantize(colors=192, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        for target in TARGETS:
            target.parent.mkdir(parents=True, exist_ok=True)
            optimized.save(target, format="PNG", optimize=True, compress_level=9)
            print(f"{target}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
