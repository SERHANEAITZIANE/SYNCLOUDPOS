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
