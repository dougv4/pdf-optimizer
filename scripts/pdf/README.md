# PDF Scripts

## Files
- `optimize_rgb.sh`: Compress + linearize with the balanced digital profile.
- `generate_bookmarks_ps.py`: Build Ghostscript pdfmark (`.ps`) from a TOC text file.
- `apply_bookmarks.sh`: Apply bookmarks to a PDF and re-linearize output.
- `validate_pdf.sh`: Validate pages/structure/bookmarks/links and compare extracted text.
- `toc_prototipo.txt`: TOC reference used in this project.

## Quick usage
```bash
scripts/pdf/optimize_rgb.sh input.pdf output.optimized-rgb.pdf
python3 scripts/pdf/generate_bookmarks_ps.py --toc scripts/pdf/toc_prototipo.txt --out-ps /tmp/bookmarks.ps --out-preview /tmp/bookmarks-preview.txt
scripts/pdf/apply_bookmarks.sh output.optimized-rgb.pdf /tmp/bookmarks.ps output.optimized-rgb.bookmarked.pdf
scripts/pdf/validate_pdf.sh output.optimized-rgb.bookmarked.pdf input.pdf
```
