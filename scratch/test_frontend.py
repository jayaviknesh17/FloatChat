import urllib.request
import re

try:
    print("Testing http://localhost:3000/...")
    req = urllib.request.urlopen('http://localhost:3000/')
    html = req.read().decode('utf-8')
    print("HTML length:", len(html))

    css_links = re.findall(r'href="(/_next/static/css/[^"]+)"', html)
    js_links = re.findall(r'src="(/_next/static/[^"]+)"', html)

    print(f"CSS links found ({len(css_links)}):", css_links)
    print(f"JS links found ({len(js_links)}):", js_links[:5])

    for css in css_links:
        res = urllib.request.urlopen(f'http://localhost:3000{css}')
        print(f"CSS {css} => Status: {res.status}, Size: {len(res.read())} bytes")

    for js in js_links[:3]:
        res = urllib.request.urlopen(f'http://localhost:3000{js}')
        print(f"JS {js} => Status: {res.status}, Size: {len(res.read())} bytes")

    print("\nTesting http://localhost:3000/insights...")
    req_ins = urllib.request.urlopen('http://localhost:3000/insights')
    html_ins = req_ins.read().decode('utf-8')
    print("Insights HTML length:", len(html_ins))

except Exception as e:
    print("Error during test:", e)
