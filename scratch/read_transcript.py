import json

log_path = r"C:\Users\tre\.gemini\antigravity-ide\brain\419668f7-9401-44ca-9b03-66dacd8c0720\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get("content", "")
            step = data.get("step_index", -1)
            source = data.get("source", "")
            type_ = data.get("type", "")
            
            # Print user requests
            if type_ == "USER_INPUT":
                print(f"[{step}] USER: {content}")
                
            # If it's a model response discussing the compilation/expo build
            if source == "MODEL" and ("expo export" in content.lower() or "compile" in content.lower() or "dist/" in content.lower() or "apk" in content.lower()):
                print(f"[{step}] MODEL (truncated): {content[:300]}...")
        except Exception as e:
            pass
