#!/usr/bin/env bash
# Downloads the Washington State OpenStreetMap extract and builds the OSRM
# driving graph (MLD). Needs Docker and about 4 GB of free memory; takes a few
# minutes. Re-run it to pick up newer map data.
set -euo pipefail
cd "$(dirname "$0")"
IMAGE=ghcr.io/project-osrm/osrm-backend:v5.27.1
mkdir -p data
curl -L -o data/washington-latest.osm.pbf https://download.geofabrik.de/north-america/us/washington-latest.osm.pbf
docker run --rm -t -v "$PWD/data:/data" $IMAGE osrm-extract -p /opt/car.lua /data/washington-latest.osm.pbf
docker run --rm -t -v "$PWD/data:/data" $IMAGE osrm-partition /data/washington-latest.osrm
docker run --rm -t -v "$PWD/data:/data" $IMAGE osrm-customize /data/washington-latest.osrm
echo "Done. Start it with: docker compose up -d"
