#!/usr/bin/env bash

PACKAGE=$1
filepath="$PACKAGE/coverage/coverage-final.json"

echo "looking for coverage file at '$filepath'"
if [[ -e $filepath ]]; then
  echo 'coverage file found; uploading...'
  bash <(curl -s https://codecov.io/bash) -f $filepath -F ${PACKAGE//-/}
else
  echo 'no coverage file found; skipping upload'
fi;
