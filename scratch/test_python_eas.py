import subprocess
res = subprocess.run(
    ["npx", "eas-cli", "build:view", "6233a8fb-5b02-4c74-80b5-40abec1788e7"],
    capture_output=True,
    text=True,
    shell=True
)
print("stdout:")
print(repr(res.stdout))
print("stderr:")
print(repr(res.stderr))
print("returncode:", res.returncode)
