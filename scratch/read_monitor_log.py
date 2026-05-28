import os

root_dir = r"C:\Users\tre\.gemini\antigravity-ide\brain\419668f7-9401-44ca-9b03-66dacd8c0720\.system_generated\tasks"
log_files = []

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.log') and "task-3713" in file:
            log_files.append(os.path.join(root, file))

if log_files:
    latest_log = log_files[-1]
    print(f"Reading target log: {latest_log}")
    with open(latest_log, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    print("=== LOG CONTENT ===")
    print(content)
else:
    print("Target monitor log task-3713 not found.")
