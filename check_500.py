import re
import urllib.error
import urllib.request

try:
    urllib.request.urlopen('http://localhost:8000/api/v1/reviews/expert/e9265024-ccf4-49bd-86af-5c807837b9f0/')
except urllib.error.HTTPError as e:
    html = e.read().decode()
    match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    if match:
        print('Exception:', match.group(1))
    match2 = re.search(r'<pre class="exception_value">(.*?)</pre>', html, re.IGNORECASE | re.DOTALL)
    if match2:
        print('Detail:', match2.group(1).strip())
