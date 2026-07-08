#!/usr/bin/env bash
set -euo pipefail

REPO="kurojs/Takoba"
INSTALL_DIR="${RAYCAST_EXTENSIONS:-$HOME/.config/raycast/extensions}/takoba"

# Try Homebrew first
if command -v brew &>/dev/null; then
  brew install kurojs/tap/takoba
  exit 0
fi

echo "=== Installing Takoba for Raycast ==="

LATEST=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | cut -d'"' -f4)
echo "Downloading $LATEST..."
mkdir -p "$INSTALL_DIR"
curl -sL "https://github.com/$REPO/releases/download/$LATEST/takoba-raycast.zip" -o /tmp/takoba-raycast.zip
unzip -qo /tmp/takoba-raycast.zip -d "$INSTALL_DIR"
rm /tmp/takoba-raycast.zip

echo ""
echo "============================================"
echo " Takoba installed at:"
echo "   $INSTALL_DIR"
echo ""
echo " Register it:"
echo "   cd $INSTALL_DIR && npx ray develop"
echo "============================================"
