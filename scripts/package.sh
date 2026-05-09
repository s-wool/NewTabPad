#!/bin/sh
set -e
VERSION=$(node -e "console.log(require('./manifest.json').version)")
OUTFILE="dist/newtabpad-${VERSION}.zip"
mkdir -p dist
rm -f "$OUTFILE"
zip -r "$OUTFILE" manifest.json newtab.html src/ styles/ icons/
echo "Created: $OUTFILE"
