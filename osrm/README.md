# Self-hosted routing (OSRM)

Atlas draws "Route from HQ" from our own OSRM server so participant
coordinates never leave our infrastructure. No API key, no per-request cost.
ETAs are free-flow drive times (no live traffic).

## Run it

1. Install Docker.
2. `./osrm/prepare.sh` downloads the Washington State map (~250 MB) from
   Geofabrik and builds the driving graph (a few minutes, ~4 GB RAM).
3. `docker compose -f osrm/docker-compose.yml up -d` starts it on port 5000.
4. Check: `curl "http://localhost:5000/route/v1/driving/-122.137,47.6446;-122.15,47.65?overview=false"`
   should return `"code":"Ok"`.
5. Set `VITE_ROUTING_URL=http://localhost:5000` (or the server's address) in
   `.env`, then restart `npm run dev` or rebuild.

## Hosting

Any small VM or container host works (2 vCPU / 4 GB RAM is plenty for one
state). Put it behind HTTPS and allow the Atlas site's origin; OSRM sends
`Access-Control-Allow-Origin: *` by default, so restrict access at the proxy
or network level if it is reachable from the internet.

`data/` holds the map and graph files and is not committed.

## Without a server

With no `VITE_ROUTING_URL`, Atlas uses the public OSRM server
(router.project-osrm.org). Only the HQ and participant map points are sent,
no names or IDs (approved by DswK 2026-10-30, pending InfoSec). If InfoSec
says no, set `VITE_ROUTING_URL` to our own server. If routing can't be
reached, the map shows a dashed straight-line estimate.
