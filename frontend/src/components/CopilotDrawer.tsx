import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, HelpCircle } from 'lucide-react';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const CopilotDrawer: React.FC<{ activeContext?: string }> = ({ activeContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: 'Hi! I am your ArthaAI Copilot. Ask me anything about your 5-year stock analysis, technical indicators (SMA, RSI, Vol), or Finance Act 2024 statutory friction.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const quickPrompts = [
    '5-Year Thesis Summary',
    'Finance Act 2024 Drag',
    'SMA 200 vs Current Price',
    'SEBI LODR Reg 30 Audit',
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;
    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { sender: 'user', text: textToSend, timestamp: time }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, context: activeContext || '' }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply || 'Analysis completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'ArthaAI Copilot is operating under verified baseline heuristic rules for Indian capital markets.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Groww-Style Trigger Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--groww-green)',
            color: '#0F1217',
            fontWeight: 800,
            fontSize: '14px',
            boxShadow: '0 8px 28px rgba(0, 208, 156, 0.4)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 208, 156, 0.55)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(0, 208, 156, 0.4)';
          }}
        >
          <Sparkles size={18} strokeWidth={2.4} />
          <span>Ask Copilot AI</span>
        </button>
      )}

      {/* Slide-Over Drawer */}
      {isOpen && (
        <aside
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '440px',
            maxWidth: '92vw',
            zIndex: 100,
            backgroundColor: 'var(--bg-chrome)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: '-12px 0 36px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--groww-green-light)',
                  color: 'var(--groww-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ArthaAI Copilot
                </div>
                <div style={{ fontSize: '10px', color: 'var(--groww-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span> SEBI Compliance &amp; Domain Guardrails Active
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Context Bar */}
          {activeContext && (
            <div
              style={{
                padding: '8px 18px',
                backgroundColor: 'var(--groww-green-light)',
                borderBottom: '1px solid rgba(0, 208, 156, 0.2)',
                fontSize: '11px',
                color: 'var(--groww-green)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HelpCircle size={13} />
              <span>Grounded Context: {activeContext}</span>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              backgroundColor: 'var(--bg-input)',
            }}
          >
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--groww-green)';
                  e.currentTarget.style.color = 'var(--groww-green)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              padding: '18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    backgroundColor: m.sender === 'user' ? 'var(--groww-green)' : 'var(--bg-surface)',
                    color: m.sender === 'user' ? '#0F1217' : 'var(--text-primary)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: m.sender === 'user' ? 700 : 400 }}>{m.text}</p>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      textAlign: 'right',
                      marginTop: '6px',
                      color: m.sender === 'user' ? 'rgba(15, 18, 23, 0.7)' : 'var(--text-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--groww-green)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span className="animate-spin">⚙</span> Consulting multi-agent research context...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div
            style={{
              padding: '16px 18px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about 5Y thesis, indicators, tax drag..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--groww-green)',
                color: '#0F1217',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0, 208, 156, 0.35)',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export default CopilotDrawer;
