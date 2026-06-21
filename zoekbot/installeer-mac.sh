#!/bin/bash
# ============================================================
# Noah zoekbot — automatisch laten opstarten op een Mac.
#
# Dit hoef je MAAR ÉÉN KEER te draaien. Daarna start de bot:
#   - vanzelf op zodra je inlogt / de Mac aangaat
#   - vanzelf opnieuw als hij ooit crasht
#
# Gebruik (in de Terminal, in deze map):
#   bash installeer-mac.sh
# ============================================================

set -e

# Map waar de bot staat (deze map).
DIR="$(cd "$(dirname "$0")" && pwd)"

# Pad naar node automatisch opzoeken.
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "❌ Node niet gevonden. Installeer Node 20+ (bv. via https://nodejs.org) en draai dit script opnieuw."
  exit 1
fi

# Controleer of .env bestaat (met BOT_SECRET enz.).
if [ ! -f "$DIR/.env" ]; then
  echo "❌ Er is nog geen .env in $DIR."
  echo "   Maak die eerst aan (kopieer .env.example naar .env en vul de waarden in)."
  exit 1
fi

PLIST="$HOME/Library/LaunchAgents/com.noah.zoekbot.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noah.zoekbot</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE</string>
        <string>--env-file=.env</string>
        <string>index.mjs</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$DIR</string>

    <!-- Start bij inloggen en houd 'm altijd levend (herstart bij crash). -->
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>

    <!-- Logbestanden zodat je kunt zien dat hij draait / wat hij doet. -->
    <key>StandardOutPath</key>
    <string>$DIR/bot.log</string>
    <key>StandardErrorPath</key>
    <string>$DIR/bot-fout.log</string>
</dict>
</plist>
PLISTEOF

echo "✅ Opstartbestand geschreven: $PLIST"

# Eventueel oude versie eruit, dan (her)laden.
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "✅ Bot is geladen en gestart."
echo ""
echo "Controleren of hij draait:"
echo "  launchctl list | grep noah.zoekbot      (een regel = hij staat geregistreerd)"
echo "  tail -f \"$DIR/bot.log\"                  (live meekijken; Ctrl+C om te stoppen)"
echo ""
echo "Belangrijk voor 'in de kast':"
echo "  - Zet automatisch inloggen aan (Systeeminstellingen > Gebruikers) zodat de bot"
echo "    na een herstart vanzelf opstart zonder dat iemand het wachtwoord intypt."
echo "  - Zet 'automatisch slapen' uit (Systeeminstellingen > Batterij/Energie) terwijl"
echo "    de Mac op stroom zit, anders pauzeert de bot."
