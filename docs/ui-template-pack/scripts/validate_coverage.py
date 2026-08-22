from pathlib import Path
import json, csv, sys
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/"ROUTE_MANIFEST.json").read_text())
admin = [x for x in manifest if x["side"]=="Admin"]
client = [x for x in manifest if x["side"]=="Client"]
errors=[]
if len(admin) != 97: errors.append(f"Admin count {len(admin)} != 97")
if len(client) != 45: errors.append(f"Client count {len(client)} != 45")
if len(manifest) != 142: errors.append(f"Total {len(manifest)} != 142")
routes=[x["route"] for x in manifest]
if len(set(routes)) != len(routes): errors.append("Duplicate routes found")
for x in manifest:
    if not (root/x["template_file"]).exists():
        errors.append(f"Missing template {x['template_file']}")
if errors:
    print("\n".join(errors)); sys.exit(1)
print("PASS: 97 admin + 45 client = 142 unique page templates; all template files exist.")
