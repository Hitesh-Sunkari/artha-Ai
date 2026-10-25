"""Check system status endpoint for real tool count."""
import urllib.request
import json

r = urllib.request.urlopen('http://127.0.0.1:8000/system/status')
s = json.loads(r.read())
print('MCP Tools:', s['fastmcp_server']['discovered_tools'])
print('MCP Healthy:', s['fastmcp_server']['healthy'])
print('A2A Healthy:', s['crewai_specialists']['healthy'])
print('A2A Routes:', s['crewai_specialists']['routes'])
print('Live Trading Blocked:', not s['live_trading_guardrail']['live_trading_enabled'])
print('ADK Specialists:', len(s['adk_orchestration']['specialists']))
print('CrewAI Specialists:', len(s['crewai_specialists']['specialists']))
print('RAG chunks:', s.get('rag_knowledge_base', {}).get('total_chunks', 'N/A'))
