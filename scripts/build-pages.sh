#!/bin/sh
# Builds GitHub Pages: Prod at /Atals-App/ and UAT at /Atals-App/uat/, plus one 404.html for both.
# Needs .env.prod.local and .env.uat.local (git-ignored). Usage: sh scripts/build-pages.sh <out dir>
set -e
OUT="${1:?usage: build-pages.sh <out dir>}"
rm -rf "$OUT"
npx vite build --mode prod --base /Atals-App/ --outDir "$OUT" --emptyOutDir
npx vite build --mode uat --base /Atals-App/uat/ --outDir "$OUT/uat" --emptyOutDir
cp scripts/pages-404.html "$OUT/404.html"
touch "$OUT/.nojekyll"
