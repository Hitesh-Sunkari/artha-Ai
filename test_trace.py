"""Inspect trace for live run."""
import urllib.request
import json

r = urllib.request.urlopen('http://127.0.0.1:8000/runs/run-api-7bd58dd49cf7/trace')
t = json.loads(r.read())
print('events_count:', t['events_count'])
for e in t['events']:
    et = e.get('event_type', 'UNKNOWN')
    ai = e.get('agent_id', 'UNKNOWN')
    st = e.get('status', 'SUCCESS')
    print(f'  {et:35s} | agent={ai:42s} | status={st}')
