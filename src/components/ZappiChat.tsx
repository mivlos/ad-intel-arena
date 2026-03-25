'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'zappi';
  content: string;
  elapsed_ms?: number;
}

let msgCounter = 0;
function makeId() {
  return `msg-${Date.now()}-${++msgCounter}`;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ZappiChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputValue]);

  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setStatusText('');
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue('');
    setIsLoading(true);

    // Append user message immediately
    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Animate status text
    setStatusText('Thinking...');
    const statusTimer = setTimeout(() => setStatusText('Querying database...'), 5000);

    try {
      let response: string;
      let elapsed_ms: number;
      let newSessionId = sessionId;

      if (!newSessionId) {
        // First message — create session
        const res = await fetch('/api/zappi-chat/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        newSessionId = data.session_id;
        setSessionId(newSessionId);
        response = data.response;
        elapsed_ms = data.elapsed_ms;
      } else {
        // Subsequent message
        const res = await fetch('/api/zappi-chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: newSessionId, message: text }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        response = data.response;
        elapsed_ms = data.elapsed_ms;
      }

      clearTimeout(statusTimer);

      const zappiMsg: ChatMessage = {
        id: makeId(),
        role: 'zappi',
        content: response || '(No response)',
        elapsed_ms,
      };
      setMessages((prev) => [...prev, zappiMsg]);
    } catch (err) {
      clearTimeout(statusTimer);
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: 'zappi',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  }, [inputValue, isLoading, sessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c3a)' }}
          >
            Z
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            Zappi Ad Intelligence
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide"
            style={{ color: '#FF6B00', border: '1px solid #FF6B00', opacity: 0.9 }}
          >
            BASELINE
          </span>
        </div>
        <button
          onClick={handleNewChat}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border border-zinc-700"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 gap-3 pb-16">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c3a)' }}
            >
              Z
            </div>
            <p className="text-zinc-400 font-medium">Ask Zappi anything about ads &amp; audiences</p>
            <p className="text-sm text-zinc-600 max-w-md">
              Zappi has access to real ad testing data. Ask about creative performance, audience
              insights, or brand strategy.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'zappi' && (
              <div
                className="w-7 h-7 rounded-md shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c3a)' }}
              >
                Z
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'max-w-[60%]' : ''}`}>
              <div
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
                    : 'bg-zinc-900 text-zinc-200 rounded-tl-sm border-l-2'
                }`}
                style={msg.role === 'zappi' ? { borderLeftColor: '#FF6B00' } : undefined}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === 'zappi' && msg.elapsed_ms != null && (
                <p className="text-xs text-zinc-600 mt-1 ml-1">
                  {formatElapsed(msg.elapsed_ms)}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-md shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c3a)' }}
            >
              Z
            </div>
            <div
              className="bg-zinc-900 border-l-2 rounded-xl rounded-tl-sm px-4 py-3 text-sm text-zinc-400 flex items-center gap-2"
              style={{ borderLeftColor: '#FF6B00' }}
            >
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              <span>{statusText}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Zappi about ad performance, audience insights..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 disabled:opacity-50 transition-colors"
            style={{ minHeight: '48px', maxHeight: '160px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{ background: '#FF6B00' }}
            aria-label="Send"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 8L2 14L4.5 8L2 2L14 8Z"
                fill="white"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-zinc-700 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
