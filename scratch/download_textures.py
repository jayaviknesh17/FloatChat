import urllib.request
import os
import shutil

os.makedirs("frontend/public/assets", exist_ok=True)

urls = {
    "frontend/public/assets/earth_blue_marble.jpg": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
    "frontend/public/assets/earth_specular.jpg": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg",
    "frontend/public/assets/earth_normal.jpg": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg",
    "frontend/public/assets/earth_clouds.png": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png"
}

headers = {'User-Agent': 'Mozilla/5.0'}

for path, url in urls.items():
    print(f"Downloading {url} to {path}...", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response, open(path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
        size = os.path.getsize(path)
        print(f"Success: {path} ({size} bytes)", flush=True)
    except Exception as e:
        print(f"Error downloading {url}: {e}", flush=True)
