#!/bin/sh

set -ex

DST=docs

compile() {
  src=$1
  dir=$(dirname "$DST/$2")
  base=$(basename "$DST/$2")
  mkdir -p "$dir"

  webpack-cli "$src" --mode development -o "$dir"
  mv -f "$dir"/main.js "$dir/$base".js

  webpack-cli "$1" --mode production -o "$dir"
  mv -f "$dir"/main.js "$dir/$base".min.js
}

compile ./index.js build/js/ski-interpreter

