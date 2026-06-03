#!/usr/bin/env python3
import re
import urllib.request

URLS = [
    "https://www.wordproject.org/bibles/he/01/1.htm",
    "https://www.wordproject.org/bibles/audio/44_hebrew/b01.htm",
]

for url in URLS:
    print("===", url)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
    mp3s = list(dict.fromkeys(re.findall(r"[a-zA-Z0-9:/._-]+\.mp3", html, re.I)))
    zips = list(dict.fromkeys(re.findall(r"[a-zA-Z0-9:/._-]+\.zip", html, re.I)))
    print("mp3:", mp3s[:10])
    print("zip:", zips[:5])
    for tag in re.findall(r"<audio[^>]+>", html, re.I):
        print("audio tag:", tag[:200])
    for tag in re.findall(r"<source[^>]+>", html, re.I):
        print("source:", tag[:200])
