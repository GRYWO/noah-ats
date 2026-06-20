#!/usr/bin/env bash
# Haalt de andere twee Noah-projecten naast deze repo binnen, zodat
# Noah ATS, Noah recruitment en Noah launch in één werkplek staan.
#
# Gebruik dit als "Setup script" van je Claude Code-omgeving op claude.ai/code.
set -euo pipefail

cd "$(dirname "$PWD")"

[ -d noah-recruitment ] || git clone https://github.com/GRYWO/noah-recruitment.git
[ -d noah-launch.nl ]   || git clone https://github.com/GRYWO/noah-launch.nl.git

echo "Klaar. Projecten in de werkplek:"
ls -1d */ 2>/dev/null
