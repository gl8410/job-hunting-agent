import urllib.request
import urllib.error
import sys

with open('test_api.txt', 'w') as f:
    try:
        req = urllib.request.Request('http://localhost:6803/api/jobs', headers={'Authorization': 'Bearer test'})
        resp = urllib.request.urlopen(req)
        f.write("STATUS: " + str(resp.status) + "\n")
        f.write("BODY: " + resp.read().decode('utf-8') + "\n")
    except urllib.error.HTTPError as e:
        f.write("HTTP ERROR: " + str(e.code) + "\n")
        f.write("BODY: " + e.read().decode('utf-8') + "\n")
    except Exception as e:
        f.write("ERROR: " + str(e) + "\n")
