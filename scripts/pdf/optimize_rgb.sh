#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <input.pdf> <output.pdf>"
  exit 1
fi

input_pdf="$1"
output_pdf="$2"
tmp_pdf="${output_pdf%.pdf}.tmp.unlinearized.pdf"

# Balanced profile used in this project:
# - RGB conversion for digital distribution
# - 150 dpi downsampling
# - JPEG quality 80
# - duplicate image detection

gs \
  -sDEVICE=pdfwrite \
  -dCompatibilityLevel=1.7 \
  -dNOPAUSE \
  -dQUIET \
  -dBATCH \
  -dDetectDuplicateImages=true \
  -sColorConversionStrategy=RGB \
  -dProcessColorModel=/DeviceRGB \
  -dDownsampleColorImages=true \
  -dColorImageDownsampleType=/Bicubic \
  -dColorImageResolution=150 \
  -dDownsampleGrayImages=true \
  -dGrayImageDownsampleType=/Bicubic \
  -dGrayImageResolution=150 \
  -dAutoFilterColorImages=false \
  -dColorImageFilter=/DCTEncode \
  -dJPEGQ=80 \
  -sOutputFile="$tmp_pdf" \
  "$input_pdf"

qpdf --linearize "$tmp_pdf" "$output_pdf"
rm -f "$tmp_pdf"

echo "Created: $output_pdf"
