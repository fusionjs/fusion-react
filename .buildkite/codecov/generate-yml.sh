#!/usr/bin/env bash

projects=$(cat manifest.json | jq -r '.projects[]')

generate() {
  cat .codecov.yml | head -n -1
  for project in $projects; do
    echo "      - ${project}/"
  done
}

echo 'generating .codecov.yml from manifest.json'
generate > .codecov.yml
