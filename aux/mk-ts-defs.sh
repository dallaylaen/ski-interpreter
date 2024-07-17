#!/bin/sh

set -uex

cd "$(dirname "$0")/.."

tsc index.js --declaration --allowJs --emitDeclarationOnly --outDir types

