import urllib.request
import json

def test_url(url, desc):
    print(f"Testing {desc}: {url}...", flush=True)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content = response.read()
            print(f"  -> SUCCESS [{status}]: {len(content)} bytes", flush=True)
            if "json" in response.headers.get('content-type', ''):
                data = json.loads(content.decode('utf-8'))
                if isinstance(data, dict):
                    print(f"     Keys: {list(data.keys())[:8]}", flush=True)
                elif isinstance(data, list):
                    print(f"     List length: {len(data)}", flush=True)
    except Exception as e:
        print(f"  -> FAILED: {e}", flush=True)

# Test Frontend Routes using 127.0.0.1
test_url("http://127.0.0.1:3000/visualizations", "Frontend /visualizations Route")
test_url("http://127.0.0.1:3000/", "Frontend Home Route")
test_url("http://127.0.0.1:3000/explorer", "Frontend Explorer Route")
test_url("http://127.0.0.1:3000/assets/earth_blue_marble.jpg", "Earth Texture Asset")
test_url("http://127.0.0.1:3000/assets/earth_specular.jpg", "Earth Specular Asset")
test_url("http://127.0.0.1:3000/assets/earth_normal.jpg", "Earth Normal Asset")
test_url("http://127.0.0.1:3000/assets/earth_clouds.png", "Earth Clouds Asset")

# Test Backend API Endpoints using 127.0.0.1
test_url("http://127.0.0.1:8000/api/v1/health", "Backend Health Check")
test_url("http://127.0.0.1:8000/api/visualizations/regions", "API Regions")
test_url("http://127.0.0.1:8000/api/visualizations/floats", "API Floats")
test_url("http://127.0.0.1:8000/api/visualizations/floats/2902235", "API Float Detail #2902235")
test_url("http://127.0.0.1:8000/api/visualizations/floats/2902235/profiles", "API Float Profiles #2902235")
test_url("http://127.0.0.1:8000/api/visualizations/observations?region=bay_of_bengal&limit=20", "API 3D Observations")
test_url("http://127.0.0.1:8000/api/visualizations/profile/2902235_1", "API Profile Analysis CTD")
test_url("http://127.0.0.1:8000/api/visualizations/anomalies?limit=10", "API Anomalies")
test_url("http://127.0.0.1:8000/api/visualizations/provenance?float_id=2902235", "API Provenance")
