#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        SYNCLOUDPOS - Local Installer       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ── Check Docker ─────────────────────────────────────────────
echo "[1/5] Checking Docker..."
if ! command -v docker &>/dev/null; then
    echo -e "${RED}ERROR: Docker is not installed!${NC}"
    echo "Install from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &>/dev/null; then
    echo -e "${RED}ERROR: Docker is not running! Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Docker is ready"

# ── Setup .env.local ─────────────────────────────────────────
echo ""
echo "[2/5] Setting up configuration..."

# Detect Machine ID from host hardware
if [ ! -f ".machine-id" ]; then
    if [ -f "/etc/machine-id" ]; then
        RAW_ID=$(cat /etc/machine-id)
    elif command -v ioreg &>/dev/null; then
        RAW_ID=$(ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null | awk -F'"' '/IOPlatformSerialNumber/{print $4}')
    else
        RAW_ID=$(hostname)-$(whoami)
    fi
    echo -n "$RAW_ID" | sha256sum | awk '{print $1}' > .machine-id 2>/dev/null || \
    echo -n "$RAW_ID" | shasum -a 256 | awk '{print $1}' > .machine-id
    echo -e "  ${GREEN}[OK]${NC} Machine ID generated"
fi
export MACHINE_ID=$(cat .machine-id)

# Create empty license file if it doesn't exist
[ ! -f "license.key" ] && touch license.key

# ── LAN Mode Setup ───────────────────────────────────────────
echo ""
echo -e "[LAN] ${YELLOW}Do you want other devices on the network to access this app?${NC}"
echo "  (Y) YES - Access from phones, tablets, other PCs on the same WiFi/LAN"
echo "  (N) NO  - This PC only (localhost)"
echo ""
read -rp "   Your choice [Y/N]: " LAN_CHOICE

if [[ "$LAN_CHOICE" =~ ^[Yy]$ ]]; then
    LAN_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || \
             ipconfig getifaddr en0 2>/dev/null || \
             hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$LAN_IP" ]; then
        export APP_URL="http://${LAN_IP}:3000"
        echo -e "  ${GREEN}[LAN]${NC} App will be accessible at: ${GREEN}${APP_URL}${NC}"
        echo "  Share this URL with other devices on the same network!"
    else
        export APP_URL="http://localhost:3000"
        echo -e "  ${YELLOW}[WARN]${NC} Could not detect LAN IP, using localhost."
    fi
else
    export APP_URL="http://localhost:3000"
    echo -e "  [LOCAL] App will only be accessible on this PC."
fi

if [ ! -f ".env.local" ]; then
    cp ".env.example" ".env.local"
    # Generate random secret
    SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 32)
    sed -i.bak "s/change_this_to_a_random_32_char_secret/$SECRET/" .env.local && rm -f .env.local.bak
    echo -e "  ${GREEN}[OK]${NC} Configuration file created (.env.local)"
    echo ""
    echo -e "  ${YELLOW}NOTE:${NC} Optional features (Google Login, WhatsApp OTP, AI)"
    echo "  require API keys. Edit .env.local to configure them."
else
    echo -e "  ${GREEN}[OK]${NC} Using existing .env.local"
fi

# ── Build ─────────────────────────────────────────────────────
echo ""
echo "[3/5] Building application (3-5 minutes on first run)..."
docker compose build --no-cache
echo -e "  ${GREEN}[OK]${NC} Build complete"

# ── Start ─────────────────────────────────────────────────────
echo ""
echo "[4/5] Starting PostgreSQL + Redis + App..."
docker compose up -d
echo -e "  ${GREEN}[OK]${NC} Services started"

# ── Wait ──────────────────────────────────────────────────────
echo ""
echo "[5/5] Waiting for app to be ready..."
ATTEMPTS=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -gt 40 ]; then
        echo -e "${RED}Timeout. Check logs: docker compose logs app${NC}"
        exit 1
    fi
    printf "."
    sleep 3
done

echo ""
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      SYNCLOUDPOS is ready!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Open: ${GREEN}http://localhost:3000${NC}"
echo ""
echo "  Click 'Register' to create your store and account."
echo ""
echo "  Commands:"
echo "    Stop:       docker compose down"
echo "    Start:      docker compose up -d"
echo "    Logs:       docker compose logs -f app"
echo ""

# Open browser (Mac/Linux)
if command -v open &>/dev/null; then
    open http://localhost:3000
elif command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:3000
fi
