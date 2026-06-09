#!/usr/bin/env bash
set -euo pipefail
 
echo "==> Installing common CLI tools"
 
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  git \
  jq \
  ripgrep \
  fd-find \
  tree \
  build-essential \
  pkg-config
 
# Debian/Ubuntuでは fd コマンド名が fdfind になるため、fd としても使えるようにする
if command -v fdfind >/dev/null 2>&1 && ! command -v fd >/dev/null 2>&1; then
  sudo ln -sf "$(command -v fdfind)" /usr/local/bin/fd
fi
 
echo "==> Setting up Python tools"
 
python3 -m pip install --user --upgrade pip pipx
python3 -m pipx ensurepath
 
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
 
pipx install uv || pipx upgrade uv || true
pipx install ruff || pipx upgrade ruff || true
pipx install mypy || pipx upgrade mypy || true
pipx install pytest || pipx upgrade pytest || true
pipx install ipython || pipx upgrade ipython || true
 
echo "==> Setting up TypeScript / Node tools"
 
corepack enable || true
corepack prepare pnpm@latest --activate || true
 
npm install -g \
  typescript \
  tsx \
  ts-node \
  eslint \
  prettier \
  vitest
 
echo "==> Installing Antigravity CLI"
 
if ! command -v agy >/dev/null 2>&1; then
  curl -fsSL https://antigravity.google/cli/install.sh | bash
fi
 
# Antigravity CLI等のユーザーローカルPATHを明示
if ! grep -q "Antigravity CLI path" "$HOME/.bashrc"; then
  cat <<'EOF' >> "$HOME/.bashrc"
 
# Antigravity CLI path
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
EOF
fi
 
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
 
echo "==> Installed versions"
 
git --version
gh --version | head -n 1 || true
python3 --version
node --version
npm --version
tsc --version
ruff --version || true
mypy --version || true
 
if command -v agy >/dev/null 2>&1; then
  echo "Antigravity CLI installed: $(command -v agy)"
else
  echo "Antigravity CLI was installed, but agy is not yet on PATH."
  echo "Open a new terminal, then run: agy"
fi
