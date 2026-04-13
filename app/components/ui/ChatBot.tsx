// app/components/ui/ChatBot.tsx
// The Watcher — a floating AI chatbot widget powered by Claude (via /api/chat).
// It streams responses in real time so text appears as it's generated.
// It also detects a special [FORGOT_PASSWORD] tag from Claude and renders an
// inline password-reset form when the user mentions they can't log in.
// This component is rendered on every page via app/layout.tsx.

'use client';

import { useState, useRef, useEffect } from 'react';
import { Skull, Eye } from 'lucide-react';

// Message shape — each item in the conversation history.
// showForgotPassword is set to true when Claude's reply contains [FORGOT_PASSWORD].
interface Message {
  role: 'user' | 'assistant';
  content: string;
  showForgotPassword?: boolean;
}

// ── ForgotPasswordForm ────────────────────────────────────────────────────────
// A small inline form that appears inside a chat bubble when Claude detects
// the user needs a password reset. Calls the same API as the full reset page.
function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  // 'idle' = form not yet submitted, 'loading' = waiting for server, 'sent' = success, 'error' = failed
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Something went wrong');
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  // Show a success message once the email has been sent
  if (status === 'sent') {
    return (
      <div className="mt-2 rounded-lg bg-green-900/30 border border-green-700/40 p-3 text-xs text-green-400">
        ✓ If that email is registered, a reset link is on its way. Check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-700"
      />
      {status === 'error' && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
      >
        {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
      </button>
    </form>
  );
}

// The exact string Claude is instructed to include when it detects a password-reset request.
// Must match the tag defined in the SYSTEM_PROMPT in /api/chat/route.ts.
const FORGOT_PASSWORD_TAG = '[FORGOT_PASSWORD]';

// parseMessage — checks whether Claude's response contains the [FORGOT_PASSWORD] tag.
// Returns the cleaned text (tag removed) and a boolean so the UI knows to show the form.
function parseMessage(content: string): { text: string; showForm: boolean } {
  if (content.includes(FORGOT_PASSWORD_TAG)) {
    return {
      text: content.replace(FORGOT_PASSWORD_TAG, '').trim(),
      showForm: true,
    };
  }
  return { text: content, showForm: false };
}

// ── ChatBot ───────────────────────────────────────────────────────────────────
// The main chatbot component. Manages:
// - Open/closed state of the floating panel
// - The full conversation history (messages array)
// - Sending messages to /api/chat and reading the streamed response
export default function ChatBot() {
  // Controls whether the chat panel is visible
  const [open, setOpen] = useState(false);

  // The conversation history — starts with The Watcher's opening greeting.
  // This greeting is displayed in the UI but is NOT sent to Claude (see route.ts).
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "I am The Watcher... I have observed every shadow on this site. Ask me anything — stories, features, or what lurks in the dark.",
    },
  ]);

  // The text currently typed in the input box
  const [input, setInput] = useState('');

  // True while waiting for Claude's streamed reply to complete
  const [loading, setLoading] = useState(false);

  // Ref attached to a dummy div at the bottom of the message list — scrolled into view on new messages
  const bottomRef = useRef<HTMLDivElement>(null);

  // Ref for the text input — used to auto-focus when the panel opens
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to the bottom whenever messages change or while loading
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-focus the input box when the chat panel is opened
  useEffect(() => {
    if (open) {
      // Small delay lets the panel finish its CSS transition before focusing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // send — called when the user clicks Send or presses Enter.
  // Adds the user message, then streams Claude's reply into the last message bubble.
  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    // Append the user's message to the conversation history
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Add an empty assistant message placeholder — we'll stream content into it below
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only role + content — the showForgotPassword flag is UI-only, not sent to Claude
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      // Read the streaming response chunk by chunk
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the raw bytes into a string fragment
        const chunk = decoder.decode(value, { stream: true });

        // Append the chunk to the last message's content and check for [FORGOT_PASSWORD]
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          const newContent = last.content + chunk;
          const { showForm } = parseMessage(newContent);
          updated[updated.length - 1] = {
            ...last,
            content: newContent,
            // Mark this message to show the password form if the tag was detected
            showForgotPassword: showForm,
          };
          return updated;
        });
      }
    } catch {
      // Replace the empty placeholder with an error message if the stream fails
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: '*The darkness swallowed my words. Please try again.*',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  // handleKey — allows the user to press Enter to send (Shift+Enter would add a newline if needed)
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating toggle button — fixed to the bottom-right of the screen on every page */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-red-700 hover:bg-red-600 shadow-lg shadow-red-900/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="Open AI chat"
      >
        {/* Shows an X when open, skull icon when closed */}
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <Skull className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat panel — only rendered when open */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-gray-900 border border-red-900/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-red-900/40">
            <Eye className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-400">The Watcher</p>
              <p className="text-xs text-gray-500">Silent Evidence AI Guide</p>
            </div>
          </div>

          {/* Messages list — scrollable, max 320px tall */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-80">
            {messages.map((msg, i) => {
              // Parse each message to strip the [FORGOT_PASSWORD] tag before rendering
              const { text, showForm } = parseMessage(msg.content);
              return (
                <div
                  key={i}
                  // User messages align right, assistant messages align left
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-red-800/70 text-white rounded-br-sm'
                        : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700'
                    }`}
                  >
                    {/* Show the text, or a blinking cursor if the stream hasn't started yet */}
                    {text || (
                      <span className="flex gap-1 items-center text-gray-500">
                        <span className="animate-pulse">▌</span>
                      </span>
                    )}
                    {/* Render the inline password-reset form if Claude flagged it */}
                    {(showForm || msg.showForgotPassword) && msg.role === 'assistant' && (
                      <ForgotPasswordForm />
                    )}
                  </div>
                </div>
              );
            })}
            {/* Invisible div at the bottom — scrolled into view on new messages */}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-800 bg-gray-900">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask The Watcher..."
              disabled={loading}
              className="flex-1 bg-gray-800 text-gray-200 placeholder-gray-600 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-700 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {/* Show ellipsis while streaming, Send otherwise */}
              {loading ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
