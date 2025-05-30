#!/bin/bash

BASE_PEERS_DIR="data/peers"

if [ ! -d "$BASE_PEERS_DIR" ] || [ -z "$(ls -A "$BASE_PEERS_DIR")" ]; then
    exit 0
fi

find "$BASE_PEERS_DIR" -mindepth 1 -maxdepth 1 -type d | while IFS= read -r peer_dir_path; do
    if [ ! -d "$peer_dir_path/incoming" ] || [ -z "$(ls -A "$peer_dir_path/incoming")" ]; then
        continue
    fi

    peer_dir_name=$(basename "$peer_dir_path")
    peer_alias="${peer_dir_name%-*}"
    peer_public_key="${peer_dir_name#*-}"

    find "$peer_dir_path/incoming" -type f -name "*.md" | while IFS= read -r report_file_path; do
        report_filename=$(basename "$report_file_path")
        
        echo "---"
        echo "Peer-Alias: $peer_alias"
        echo "Peer-Public-Key: $peer_public_key"
        echo "Report-Filename: $report_filename"
        echo "---"
        cat "$report_file_path"
        if [ "$(tail -c1 "$report_file_path" | wc -l)" -eq 0 ]; then
            echo
        fi
    done
done
