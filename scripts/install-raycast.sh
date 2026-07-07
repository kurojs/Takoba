#!/bin/bash
set -e

INSTALL_DIR="$HOME/.local/share/raycast/extensions/takoba"

echo "=== Installing Takoba for Raycast ==="
echo ""

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is required. Install from https://nodejs.org"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "ERROR: git is required."
  exit 1
fi

if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --rebase
else
  echo "Cloning Takoba..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone https://github.com/kurojs/Takoba.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building extension for Raycast..."
npm run build:raycast

echo ""
echo "============================================"
echo " Takoba is installed at:"
echo "   $INSTALL_DIR"
echo ""
echo " To register with Raycast, run:"
echo "   cd $INSTALL_DIR && npx ray develop"
echo ""
echo " Or open Raycast -> 'Import Extension' ->"
echo " Select: $INSTALL_DIR"
echo "============================================"
