"""Test live research run against running API."""
import urllib.request
import json
import time

payload = json.dumps({
    'symbol': 'RELIANCE',
    'as_of_time': '2026-10-25T17:00:00Z',
    'orchestration_pattern': 'SEQUENTIAL',
    'scope': ['quant', 'compliance', 'adversarial'],
    'timeframe': '1d'
}).encode()

req = urllib.request.Request(
    'http://127.0.0.1:8000/research',
    data=payload,
    method='POST',
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req)
sub = json.loads(resp.read())
print('SUBMIT:', json.dumps(sub, indent=2))
run_id = sub['run_id']

# Poll for up to 75 seconds
for i in range(30):
    time.sleep(2.5)
    r2 = urllib.request.urlopen(f'http://127.0.0.1:8000/runs/{run_id}')
    state = json.loads(r2.read())
    status = state['status']
    print(f'Poll {i+1}: status={status}')
    if status in ('COMPLETED', 'FAILED'):
        print('FINAL STATE:', json.dumps(state, indent=2)[:4000])
        # Also get trace
        r3 = urllib.request.urlopen(f'http://127.0.0.1:8000/runs/{run_id}/trace')
        trace = json.loads(r3.read())
        print(f'TRACE: events_count={trace["events_count"]}')
        if trace['events']:
            print('FIRST 5 EVENTS:')
            for e in trace['events'][:5]:
                print(f'  - {e["event_type"]} / {e["agent_id"]} / {e.get("status")}')
        break
else:
    print('TIMED OUT waiting for run to complete')
