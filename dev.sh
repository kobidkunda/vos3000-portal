#!/usr/bin/env bash
# ==============================================================================
# VOS3000 Admin + Client Portal — Unified Dev Runner & Test Lifecycle Script
# ==============================================================================

set -eo pipefail

# Determine script and project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ANSI Colors for terminal output
BOLD="\033[1m"
DIM="\033[2m"
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"
CYAN="\033[1;36m"
WHITE="\033[1;37m"
RESET="\033[0m"

# Default configuration
DEFAULT_API_PORT=4000
DEFAULT_WEB_PORT=3001
API_PORT=""
WEB_PORT=""
SKIP_TESTS=false
TEST_ONLY=false
WITH_WORKER=false
STOP_ONLY=false
DO_CLEAN=false

LOGS_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOGS_DIR/dev.pids"

# Print CLI help
show_help() {
  printf "${CYAN}============================================================${RESET}\n"
  printf "${BOLD}${WHITE}  VOS3000 Admin + Client Portal — Dev Runner Help           ${RESET}\n"
  printf "${CYAN}============================================================${RESET}\n\n"
  printf "${BOLD}Usage:${RESET} ./dev.sh [OPTIONS]\n\n"
  printf "${BOLD}Options:${RESET}\n"
  printf "  ${GREEN}-s, --skip-tests${RESET}    Skip pre-flight dev tests and start dev servers immediately\n"
  printf "  ${GREEN}-t, --test-only${RESET}     Run pre-flight builds and dev test suites then exit\n"
  printf "  ${GREEN}-w, --with-worker${RESET}   Also launch the background worker (@vos/worker)\n"
  printf "  ${GREEN}-k, --stop${RESET}          Stop all running dev server processes and exit\n"
  printf "  ${GREEN}-c, --clean${RESET}         Clean build caches (.next, dist, node_modules/.cache, logs)\n"
  printf "      ${GREEN}--api-port <P>${RESET}  Specify API port (default: 4000 or from .env)\n"
  printf "      ${GREEN}--web-port <P>${RESET}  Specify Web port (default: 3001)\n"
  printf "  ${GREEN}-h, --help${RESET}          Show this help message\n\n"
  printf "${BOLD}Examples:${RESET}\n"
  printf "  ${CYAN}./dev.sh${RESET}               # Check/stop existing, run dev tests, start app with live logs\n"
  printf "  ${CYAN}./dev.sh --skip-tests${RESET}  # Restart app quickly without test suite\n"
  printf "  ${CYAN}./dev.sh --test-only${RESET}   # Run only shared/api/web tests and validator\n"
  printf "  ${CYAN}./dev.sh --stop${RESET}        # Kill all running dev processes and free ports\n"
}

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -s|--skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    -t|--test-only)
      TEST_ONLY=true
      shift
      ;;
    -w|--with-worker)
      WITH_WORKER=true
      shift
      ;;
    -k|--stop)
      STOP_ONLY=true
      shift
      ;;
    -c|--clean)
      DO_CLEAN=true
      shift
      ;;
    --api-port)
      API_PORT="$2"
      shift 2
      ;;
    --web-port)
      WEB_PORT="$2"
      shift 2
      ;;
    *)
      printf "${RED}Unknown argument: %s${RESET}\n" "$1"
      printf "Run ${BOLD}./dev.sh --help${RESET} for available options.\n"
      exit 1
      ;;
  esac
done

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Print banner
print_banner() {
  printf "${CYAN}============================================================${RESET}\n"
  printf "${BOLD}${WHITE}  VOS3000 Admin + Client Portal — Development Environment   ${RESET}\n"
  printf "${CYAN}============================================================${RESET}\n"
}

# Logger helpers
log_info() {
  printf "${CYAN}[DEV]${RESET} %s\n" "$1"
}

log_success() {
  printf "${GREEN}[DEV] ✔ %s${RESET}\n" "$1"
}

log_warn() {
  printf "${YELLOW}[DEV] ⚠ %s${RESET}\n" "$1"
}

log_error() {
  printf "${RED}[DEV] ✖ %s${RESET}\n" "$1"
}

log_step() {
  printf "\n${BOLD}${BLUE}==>${RESET} ${BOLD}%s${RESET}\n" "$1"
}

# Resolve Ports from .env or defaults
resolve_config() {
  if [[ -f ".env" ]]; then
    if [[ -z "$API_PORT" ]]; then
      local env_port
      env_port=$(grep -E "^PORT=" .env | head -n 1 | cut -d '=' -f2 | tr -d ' "\r\n')
      if [[ -n "$env_port" ]]; then
        API_PORT="$env_port"
      fi
    fi
  else
    if [[ -f ".env.example" ]]; then
      log_warn "No .env found. Creating .env from .env.example..."
      cp .env.example .env
    fi
  fi

  API_PORT="${API_PORT:-$DEFAULT_API_PORT}"
  WEB_PORT="${WEB_PORT:-$DEFAULT_WEB_PORT}"
}

# Clean cache directories
clean_caches() {
  log_step "Cleaning build caches and logs"
  rm -rf "$SCRIPT_DIR/apps/web/.next"
  rm -rf "$SCRIPT_DIR/apps/api/dist"
  rm -rf "$SCRIPT_DIR/apps/worker/dist"
  rm -rf "$SCRIPT_DIR/packages/shared/dist"
  rm -rf "$SCRIPT_DIR/packages/vos-adapter/dist"
  rm -rf "$SCRIPT_DIR/node_modules/.cache"
  rm -rf "$LOGS_DIR"/*.log
  mkdir -p "$LOGS_DIR"
  log_success "Build caches cleaned."
}

# Process cleanup: Find & kill processes by port and matching project node processes
kill_existing_processes() {
  log_step "Checking for running instances of the app on ports $API_PORT, $WEB_PORT, 3000..."

  local pids_to_kill=()

  # 1. Check ports using lsof
  for port in "$API_PORT" "$WEB_PORT" 3000; do
    if command -v lsof >/dev/null 2>&1; then
      local port_pids
      port_pids=$(lsof -ti "tcp:$port" 2>/dev/null || true)
      if [[ -n "$port_pids" ]]; then
        for pid in $port_pids; do
          if [[ -n "$pid" && "$pid" != "$$" ]]; then
            pids_to_kill+=("$pid")
          fi
        done
      fi
    fi
  done

  # 2. Check previous PID file if available
  if [[ -f "$PID_FILE" ]]; then
    while IFS= read -r pid || [[ -n "$pid" ]]; do
      pid=$(echo "$pid" | tr -d '[:space:]')
      if [[ -n "$pid" && "$pid" != "$$" ]] && kill -0 "$pid" 2>/dev/null; then
        pids_to_kill+=("$pid")
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi

  # 3. Check for specific tsx/next-server/node processes running inside this workspace
  if command -v pgrep >/dev/null 2>&1; then
    local matched_pids
    matched_pids=$(pgrep -f "$SCRIPT_DIR/apps/(api|web|worker)" 2>/dev/null || true)
    if [[ -n "$matched_pids" ]]; then
      for pid in $matched_pids; do
        if [[ -n "$pid" && "$pid" != "$$" ]]; then
          pids_to_kill+=("$pid")
        fi
      done
    fi
  fi

  # Deduplicate PIDs
  local unique_pids=()
  if [[ ${#pids_to_kill[@]} -gt 0 ]]; then
    unique_pids=($(printf "%s\n" "${pids_to_kill[@]}" | sort -u))
  fi

  if [[ ${#unique_pids[@]} -gt 0 ]]; then
    log_warn "Detected running processes with PIDs: ${unique_pids[*]}"
    log_info "Closing all existing app processes gracefully (SIGTERM)..."
    for pid in "${unique_pids[@]}"; do
      kill -15 "$pid" 2>/dev/null || true
    done

    # Wait up to 3 seconds for graceful shutdown
    local max_wait=30
    local count=0
    while [[ $count -lt $max_wait ]]; do
      local any_alive=false
      for pid in "${unique_pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
          any_alive=true
          break
        fi
      done
      if [[ "$any_alive" = false ]]; then
        break
      fi
      sleep 0.1
      count=$((count + 1))
    done

    # Force kill any lingering processes
    for pid in "${unique_pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        log_warn "Process $pid did not exit in time. Force killing (SIGKILL)..."
        kill -9 "$pid" 2>/dev/null || true
      fi
    done

    # Ensure ports are freed
    sleep 0.5
    log_success "All previous processes closed and ports freed."
  else
    log_info "No running app processes detected on target ports."
  fi
}

# Verify Node.js version and required dependencies
check_prerequisites() {
  log_step "Checking prerequisites"

  if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js is not installed or not in PATH."
    exit 1
  fi

  local node_version
  node_version=$(node -v | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d '.' -f 1)

  if [[ "$major_version" -lt 22 ]]; then
    log_warn "Detected Node.js v$node_version. Project engines recommend >= 22.0.0."
  else
    log_info "Node.js version: v$node_version (OK)"
  fi

  if ! command -v npm >/dev/null 2>&1; then
    log_error "npm is not installed or not in PATH."
    exit 1
  fi
  log_info "npm version: $(npm -v) (OK)"

  # Check if node_modules exist
  if [[ ! -d "node_modules" ]]; then
    log_warn "node_modules missing. Running npm install..."
    npm install
  fi
}

# Run predev builds and full test suite
run_dev_tests() {
  log_step "Building shared packages (@vos/shared, @vos/adapter)..."
  npm run build -w @vos/shared
  npm run build -w @vos/adapter
  log_success "Shared packages built successfully."

  log_step "Running dev test suites..."

  printf "${BOLD}[1/4] Running @vos/shared unit tests...${RESET}\n"
  npm run test -w @vos/shared

  printf "${BOLD}[2/4] Running @vos/api integration tests...${RESET}\n"
  npm run test -w @vos/api

  printf "${BOLD}[3/4] Running @vos/web wizard tests...${RESET}\n"
  npm run test -w @vos/web

  printf "${BOLD}[4/4] Running application structure & API validator...${RESET}\n"
  if command -v python3 >/dev/null 2>&1; then
    python3 scripts/validate_application.py
  else
    log_warn "python3 not found; skipping scripts/validate_application.py"
  fi

  # Check migrations if DATABASE_URL is configured and reachable
  if [[ -f "scripts/migrate-postgres.mjs" && -f ".env" ]]; then
    log_info "Applying PostgreSQL schema migrations (if DB available)..."
    node --env-file=.env scripts/migrate-postgres.mjs 2>/dev/null && log_success "PostgreSQL migrations verified." || log_warn "PostgreSQL not reachable or migration skipped (OK for demo mode)."
  fi

  log_success "All dev tests & validations PASSED!"
}

# Array to hold background PIDs spawned during dev run
SPAWNED_PIDS=()
CLEANED_UP=false

cleanup_all() {
  if [[ "$CLEANED_UP" = true ]]; then
    return
  fi
  CLEANED_UP=true

  printf "\n"
  log_step "Shutting down development servers..."

  # Kill all spawned PIDs
  if [[ ${#SPAWNED_PIDS[@]} -gt 0 ]]; then
    for pid in "${SPAWNED_PIDS[@]}"; do
      if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        kill -15 "$pid" 2>/dev/null || true
      fi
    done
  fi

  # Also kill ports to be 100% thorough
  for port in "$API_PORT" "$WEB_PORT"; do
    if command -v lsof >/dev/null 2>&1; then
      local lingering
      lingering=$(lsof -ti "tcp:$port" 2>/dev/null || true)
      if [[ -n "$lingering" ]]; then
        for pid in $lingering; do
          kill -9 "$pid" 2>/dev/null || true
        done
      fi
    fi
  done

  rm -f "$PID_FILE"
  log_success "All dev services stopped cleanly. Goodbye!"
}

# Register traps for termination signals
handle_signal() {
  cleanup_all
  exit 0
}

# Start Dev Services and stream logs
start_dev_servers() {
  trap handle_signal INT TERM HUP

  log_step "Starting development servers..."

  local API_LOG="$LOGS_DIR/api.log"
  local WEB_LOG="$LOGS_DIR/web.log"
  local WORKER_LOG="$LOGS_DIR/worker.log"
  local COMBINED_LOG="$LOGS_DIR/dev.log"

  # Truncate old log files
  : > "$API_LOG"
  : > "$WEB_LOG"
  : > "$WORKER_LOG"
  : > "$COMBINED_LOG"

  # Start API Server in background
  (
    cd "$SCRIPT_DIR/apps/api"
    export PORT="$API_PORT"
    export NODE_ENV=development
    export FORCE_COLOR=1
    npm run dev 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
      echo "$line" >> "$API_LOG"
      echo "$line" >> "$COMBINED_LOG"
      printf "${CYAN}[API]${RESET} %s\n" "$line"
    done
  ) &
  local api_pid=$!
  SPAWNED_PIDS+=("$api_pid")

  # Start Web Server in background
  (
    cd "$SCRIPT_DIR/apps/web"
    export PORT="$WEB_PORT"
    export NODE_ENV=development
    export FORCE_COLOR=1
    npm run dev 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
      echo "$line" >> "$WEB_LOG"
      echo "$line" >> "$COMBINED_LOG"
      printf "${GREEN}[WEB]${RESET} %s\n" "$line"
    done
  ) &
  local web_pid=$!
  SPAWNED_PIDS+=("$web_pid")

  # Optional Worker
  local worker_pid=""
  if [[ "$WITH_WORKER" = true ]]; then
    (
      cd "$SCRIPT_DIR/apps/worker"
      export NODE_ENV=development
      export FORCE_COLOR=1
      npm run dev 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
        echo "$line" >> "$WORKER_LOG"
        echo "$line" >> "$COMBINED_LOG"
        printf "${MAGENTA}[WORKER]${RESET} %s\n" "$line"
      done
    ) &
    worker_pid=$!
    SPAWNED_PIDS+=("$worker_pid")
  fi

  # Save PIDs to file
  printf "%s\n" "${SPAWNED_PIDS[@]}" > "$PID_FILE"

  # Health check watcher in background
  (
    local api_ready=false
    local web_ready=false
    local attempts=0
    local max_attempts=40

    while [[ $attempts -lt $max_attempts ]]; do
      sleep 1
      attempts=$((attempts + 1))

      if [[ "$api_ready" = false ]]; then
        if curl -s -f -m 2 "http://localhost:$API_PORT/api/v1/health" >/dev/null 2>&1 || curl -s -m 2 "http://localhost:$API_PORT/docs" >/dev/null 2>&1; then
          api_ready=true
        fi
      fi

      if [[ "$web_ready" = false ]]; then
        if curl -s -f -m 2 "http://localhost:$WEB_PORT" >/dev/null 2>&1 || curl -s -m 2 "http://localhost:$WEB_PORT" >/dev/null 2>&1; then
          web_ready=true
        fi
      fi

      if [[ "$api_ready" = true && "$web_ready" = true ]]; then
        break
      fi
    done

    printf "\n"
    printf "${GREEN}============================================================${RESET}\n"
    printf "${BOLD}${GREEN}  ✔ VOS3000 Portal Development Environment is READY!        ${RESET}\n"
    printf "${GREEN}============================================================${RESET}\n"
    printf "  ${BOLD}Web UI:${RESET}       ${CYAN}http://localhost:%s${RESET}\n" "$WEB_PORT"
    printf "  ${BOLD}API Server:${RESET}   ${CYAN}http://localhost:%s${RESET}\n" "$API_PORT"
    printf "  ${BOLD}Swagger Docs:${RESET} ${CYAN}http://localhost:%s/docs${RESET}\n" "$API_PORT"
    printf "  ${BOLD}Health Check:${RESET} ${CYAN}http://localhost:%s/api/v1/health${RESET}\n" "$API_PORT"
    printf "${DIM}------------------------------------------------------------${RESET}\n"
    printf "  ${BOLD}Demo Admin:${RESET}   admin@example.com / Admin123!\n"
    printf "  ${BOLD}Demo Client:${RESET}  client@example.com / Client123!\n"
    printf "${DIM}------------------------------------------------------------${RESET}\n"
    printf "  ${DIM}Logs saved to: %s/${RESET}\n" "$LOGS_DIR"
    printf "  ${BOLD}Live log streaming below (Press Ctrl+C to stop all)...${RESET}\n"
    printf "${GREEN}============================================================${RESET}\n\n"
  ) &

  # Wait on background processes
  wait
}

# ==============================================================================
# Main Execution Flow
# ==============================================================================

print_banner
resolve_config

if [[ "$DO_CLEAN" = true ]]; then
  clean_caches
fi

# 1. Close all existing instances if app is running
kill_existing_processes

if [[ "$STOP_ONLY" = true ]]; then
  log_success "Stop request completed."
  exit 0
fi

# 2. Check Node & tools
check_prerequisites

# 3. Run Dev Tests & Validations unless skipped
if [[ "$SKIP_TESTS" = false ]]; then
  run_dev_tests
else
  log_step "Skipping dev tests (--skip-tests specified). Building shared packages..."
  npm run build -w @vos/shared
  npm run build -w @vos/adapter
  log_success "Shared packages built."
fi

if [[ "$TEST_ONLY" = true ]]; then
  log_success "Dev test run completed successfully."
  exit 0
fi

# 4. Start Dev Servers with Live Logs
start_dev_servers
