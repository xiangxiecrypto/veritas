#!/usr/bin/env python3
"""
Smart Restart Script for Hyperliquid Trading Bot
Checks if bot is running and restarts if needed
"""

import os
import sys
import subprocess
import json
from datetime import datetime, timezone
from pathlib import Path

BOT_DIR = Path("/home/xiang/.openclaw/workspace/hyperliquid_bot")
STATE_FILE = BOT_DIR / "bot_state.json"
LOG_FILE = BOT_DIR / "trading_bot.log"
LIVE_LOG = BOT_DIR / "bot_live.log"
PID_FILE = BOT_DIR / ".bot.pid"

# Max minutes since last log before considering bot dead
MAX_IDLE_MINUTES = 15

def get_last_log_time():
    """Get timestamp of last log entry"""
    try:
        if LOG_FILE.exists():
            # Get last line
            result = subprocess.run(
                ["tail", "-1", str(LOG_FILE)],
                capture_output=True, text=True
            )
            last_line = result.stdout.strip()
            # Parse timestamp like: 2026-02-13 13:41:13 (UTC+8)
            if last_line and " - " in last_line:
                time_str = last_line.split(" - ")[0]
                try:
                    dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S (UTC+8)")
                    # Convert to UTC
                    from datetime import timedelta
                    dt_utc = dt - timedelta(hours=8)
                    return dt_utc
                except:
                    pass
    except Exception as e:
        print(f"Error reading log: {e}")
    return None

def is_process_running():
    """Check if bot process is running"""
    try:
        result = subprocess.run(
            ["pgrep", "-f", "hyperliquid.*trading"],
            capture_output=True
        )
        return result.returncode == 0
    except:
        return False

def update_state(status, message=""):
    """Update bot state file"""
    try:
        state = {}
        if STATE_FILE.exists():
            with open(STATE_FILE) as f:
                state = json.load(f)
        
        state["status"] = status
        state["last_check"] = datetime.now(timezone.utc).isoformat()
        if message:
            state["last_message"] = message
        
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Error updating state: {e}")

def restart_bot():
    """Restart the trading bot"""
    try:
        # Change to bot directory
        os.chdir(BOT_DIR)
        
        # Kill any existing processes
        subprocess.run(["pkill", "-f", "hyperliquid.*trading"], capture_output=True)
        
        # Check if there's a run script
        run_script = BOT_DIR / "run.sh"
        if run_script.exists():
            subprocess.Popen(
                ["bash", str(run_script), "aggressive", "--paper"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
        else:
            # Try to find the bot script
            bot_script = None
            for pattern in ["trading_bot.py", "bot.py", "main.py", "hyperliquid*.py"]:
                matches = list(BOT_DIR.glob(pattern))
                if matches:
                    bot_script = matches[0]
                    break
            
            if bot_script:
                # Start the bot
                env = os.environ.copy()
                env["PYTHONPATH"] = str(BOT_DIR)
                subprocess.Popen(
                    [sys.executable, str(bot_script)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                    env=env
                )
            else:
                return False, "No bot script found"
        
        return True, "Bot restarted successfully"
    except Exception as e:
        return False, f"Error restarting bot: {e}"

def main():
    """Main monitoring function"""
    now = datetime.now(timezone.utc)
    last_log = get_last_log_time()
    process_running = is_process_running()
    
    status_info = {
        "timestamp": now.isoformat(),
        "process_running": process_running,
        "last_log_time": last_log.isoformat() if last_log else None,
        "action_taken": None
    }
    
    needs_restart = False
    reason = ""
    
    if not process_running:
        needs_restart = True
        reason = "Process not running"
    elif last_log:
        idle_minutes = (now - last_log).total_seconds() / 60
        if idle_minutes > MAX_IDLE_MINUTES:
            needs_restart = True
            reason = f"No logs for {idle_minutes:.1f} minutes"
    else:
        needs_restart = True
        reason = "Cannot determine last log time"
    
    if needs_restart:
        print(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Bot unhealthy: {reason}")
        success, message = restart_bot()
        status_info["action_taken"] = "restart"
        status_info["restart_success"] = success
        status_info["restart_message"] = message
        
        if success:
            update_state("Running", f"Restarted at {now.isoformat()}: {reason}")
            print(f"✅ {message}")
        else:
            update_state("Error", message)
            print(f"❌ {message}")
    else:
        status_info["action_taken"] = "none"
        status_info["status"] = "healthy"
        idle_str = ""
        if last_log:
            idle_minutes = (now - last_log).total_seconds() / 60
            idle_str = f" (idle {idle_minutes:.1f} min)"
        print(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Bot healthy{idle_str}")
        update_state("Stopped - Script Missing", f"Bot script not found at {now.isoformat()}")
    
    return status_info

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result.get("restart_success", True) else 1)
