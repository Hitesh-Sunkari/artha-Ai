import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';

const API = 'http://127.0.0.1:8000';

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
      text: 'Hello! I am ArthaAI Copilot. Ask me anything about your current research run, portfolio allocations, SEBI LODR rules, or Finance Act 2024 statutory costs.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, timestamp: time }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: activeContext || '' }),
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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach backend copilot service. Ensure FastAPI server is running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#00f0ff] hover:bg-[#00d0df] text-black font-bold text-sm shadow-xl shadow-[#00f0ff]/20 transition-all hover:scale-105"
        >
          <Sparkles size={16} /> Ask ArthaAI Copilot
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] rounded-2xl bg-[#0d1117] border border-[#30363d] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#21262d] flex justify-between items-center bg-[#161b22]">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[#00f0ff]" />
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">ArthaAI Copilot</h4>
                <span className="text-[10px] font-mono text-emerald-400">Gemini 3.5 Flash Active</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] flex items-center justify-center shrink-0 text-xs">
                    ✦
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#00f0ff] text-black font-medium'
                      : 'bg-[#161b22] text-[#c9d1d9] border border-[#21262d]'
                  }`}
                >
                  <p>{m.text}</p>
                  <span
                    className={`text-[9px] block text-right mt-1 font-mono ${
                      m.sender === 'user' ? 'text-black/60' : 'text-[#8b949e]'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-[#8b949e] font-mono text-[11px]">
                <span className="animate-spin">⚙</span> Reasoning with Gemini...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-[#21262d] bg-[#161b22] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about risk, SEBI rules, taxes..."
              className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white focus:outline-none focus:border-[#00f0ff]"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg bg-[#00f0ff] hover:bg-[#00d0df] text-black disabled:opacity-40 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
