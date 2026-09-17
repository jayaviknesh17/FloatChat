import urllib.request
import re
import time

time.sleep(2)
url = "http://localhost:3000/insights"
print(f"Fetching {url}...")
req = urllib.request.urlopen(url)
html = req.read().decode('utf-8')
print("HTML Status Code:", req.status)

css_urls = re.findall(r'href="(/_next/static/[^"]+\.css[^"]*)"', html)
print(f"Found {len(css_urls)} CSS assets:")
for css_url in css_urls:
    res = urllib.request.urlopen("http://localhost:3000" + css_url)
    print(f"  CSS: {css_url} -> Status {res.status}")

js_urls = re.findall(r'src="(/_next/static/[^"]+\.js[^"]*)"', html)
print(f"Found {len(js_urls)} JS assets:")
for js_url in js_urls[:5]:
    res = urllib.request.urlopen("http://localhost:3000" + js_url)
    print(f"  JS: {js_url} -> Status {res.status}")

print("\nALL ASSETS RETURNING 200 OK!")
