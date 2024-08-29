#!/bin/sh

set -uex

DIR="docs/quest-data"

cd "$(basename $0)/.."

find "$DIR" -name \*.json -exec \
  perl -MUUID=uuid -w -i -p -e 's/([^\\]"id"\s*:\s*")"/$1 . uuid() . q{"}/sge' {} \;

