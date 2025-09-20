import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIStatus {
  available: boolean;
  initialized: boolean;
}

export function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ available: false, initialized: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history and AI status on mount
    loadChatHistory();
    checkAIStatus();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await window.electronAPI.ai.history();
      // Filter out system messages for the UI
      const userMessages = history.filter((msg: any) => msg.role !== 'system');
      setMessages(userMessages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const checkAIStatus = async () => {
    try {
      const status = await window.electronAPI.ai.status();
      setAiStatus(status);
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await window.electronAPI.ai.chat({ message: userMessage });

      // Add assistant response
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await window.electronAPI.ai.clear();
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!aiStatus.available) {
    return (
      <div className="ai-chat-page">
        <style>{styles}</style>
        <div className="ai-unavailable">
          <div className="ai-unavailable-icon">🤖</div>
          <h2>AI Assistant Unavailable</h2>
          <p>The AI assistant requires an OpenAI API key to be configured.</p>
          <p>Please add your OpenAI API key in the Settings page to enable the AI assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-page">
      <style>{styles}</style>

      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <h2>SlimScan AI Assistant</h2>
          <span className={`status-indicator ${aiStatus.initialized ? 'online' : 'offline'}`}>
            {aiStatus.initialized ? 'Online' : 'Offline'}
          </span>
        </div>
        <button
          className="clear-button"
          onClick={handleClearHistory}
          disabled={messages.length === 0}
        >
          Clear History
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-icon">👋</div>
            <h3>Welcome to SlimScan AI!</h3>
            <p>I'm your intelligent trading assistant. I can help you with:</p>
            <ul>
              <li>📊 Running CAN SLIM stock scans</li>
              <li>⚙️ Adjusting your scan settings</li>
              <li>📈 Analyzing your portfolio</li>
              <li>💰 Placing paper trades</li>
              <li>🧠 Providing CAN SLIM investment analysis</li>
            </ul>
            <p>Ask me anything about your trading strategy or analysis!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom components for better styling
                        code: ({ node, className, children, ...props }: any) => {
                          const inline = !className || !className.includes('language-');
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <pre className="code-block">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="inline-code" {...props}>
                              {children}
                            </code>
                          );
                        },
                        table: ({ children }) => (
                          <div className="table-wrapper">
                            <table className="markdown-table">{children}</table>
                          </div>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="markdown-blockquote">{children}</blockquote>
                        ),
                        h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                        h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                        h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                        ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                        ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                        li: ({ children }) => <li className="markdown-li">{children}</li>,
                        p: ({ children }) => <p className="markdown-p">{children}</p>,
                        strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                        em: ({ children }) => <em className="markdown-em">{children}</em>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about your trading strategy, run a scan, or analyze your portfolio..."
          rows={3}
          disabled={isLoading}
        />
        <button type="submit" disabled={!inputValue.trim() || isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles = `
  .ai-chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-background);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .chat-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .chat-icon {
    font-size: var(--font-size-xl);
  }

  .chat-title h2 {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
  }

  .status-indicator {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .status-indicator.online {
    background-color: var(--color-success-light);
    color: var(--color-success-dark);
  }

  .status-indicator.offline {
    background-color: var(--color-error-light);
    color: var(--color-error-dark);
  }

  .clear-button {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-sm);
  }

  .clear-button:hover:not(:disabled) {
    background-color: var(--color-background-secondary);
    color: var(--color-text);
  }

  .clear-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .welcome-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: auto;
  }

  .welcome-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-md);
  }

  .welcome-message h3 {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
  }

  .welcome-message ul {
    text-align: left;
    margin: var(--spacing-md) 0;
    padding-left: var(--spacing-md);
  }

  .welcome-message li {
    margin-bottom: var(--spacing-xs);
  }

  .message {
    display: flex;
    gap: var(--spacing-sm);
    max-width: 80%;
  }

  .message.user {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .message.assistant {
    align-self: flex-start;
  }

  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background-color: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }

  .message.user .message-avatar {
    background-color: var(--color-primary);
    color: white;
  }

  .message-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .message-text {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    color: var(--color-text);
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .message.user .message-text {
    background-color: var(--color-primary);
    color: white;
  }

  .message-time {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    text-align: right;
  }

  .message.user .message-time {
    text-align: left;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: var(--spacing-sm) var(--spacing-md);
    align-items: center;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background-color: var(--color-text-secondary);
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      opacity: 0.3;
    }
    30% {
      opacity: 1;
    }
  }

  .chat-input {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-surface);
    align-items: flex-end;
  }

  .chat-input textarea {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background);
    color: var(--color-text);
    resize: none;
    font-family: inherit;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    min-height: 60px;
  }

  .chat-input textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .chat-input button {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    border: none;
    background-color: var(--color-primary);
    color: white;
    cursor: pointer;
    font-weight: var(--font-weight-medium);
    transition: all 0.2s ease;
    height: 40px;
  }

  .chat-input button:hover:not(:disabled) {
    background-color: var(--color-primary-dark);
  }

  .chat-input button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-unavailable {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-secondary);
  }

  .ai-unavailable-icon {
    font-size: 64px;
    margin-bottom: var(--spacing-lg);
    opacity: 0.5;
  }

  .ai-unavailable h2 {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
  }

  .ai-unavailable p {
    margin-bottom: var(--spacing-sm);
    max-width: 400px;
  }

  /* Markdown styling */
  .message-text .code-block {
    background-color: var(--color-background-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    margin: var(--spacing-xs) 0;
    overflow-x: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .message-text .inline-code {
    background-color: var(--color-background-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    padding: 2px 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9em;
  }

  .message-text .table-wrapper {
    overflow-x: auto;
    margin: var(--spacing-sm) 0;
  }

  .message-text .markdown-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .message-text .markdown-table th,
  .message-text .markdown-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
  }

  .message-text .markdown-table th {
    background-color: var(--color-background-secondary);
    font-weight: var(--font-weight-medium);
  }

  .message-text .markdown-table tr:last-child td {
    border-bottom: none;
  }

  .message-text .markdown-blockquote {
    border-left: 4px solid var(--color-primary);
    padding-left: var(--spacing-md);
    margin: var(--spacing-sm) 0;
    font-style: italic;
    color: var(--color-text-secondary);
  }

  .message-text .markdown-h1,
  .message-text .markdown-h2,
  .message-text .markdown-h3 {
    margin: var(--spacing-sm) 0 var(--spacing-xs) 0;
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
  }

  .message-text .markdown-h1 {
    font-size: var(--font-size-lg);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-xs);
  }

  .message-text .markdown-h2 {
    font-size: var(--font-size-md);
  }

  .message-text .markdown-h3 {
    font-size: var(--font-size-sm);
  }

  .message-text .markdown-ul,
  .message-text .markdown-ol {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
  }

  .message-text .markdown-li {
    margin: var(--spacing-xs) 0;
  }

  .message-text .markdown-p {
    margin: var(--spacing-sm) 0;
    line-height: 1.5;
  }

  .message-text .markdown-strong {
    font-weight: var(--font-weight-semibold);
  }

  .message-text .markdown-em {
    font-style: italic;
  }

  /* User messages don't need markdown styling */
  .message.user .message-text {
    white-space: pre-wrap;
  }

  /* Assistant messages with markdown */
  .message.assistant .message-text {
    white-space: normal;
  }

  /* Ensure proper spacing for first and last elements in markdown */
  .message-text > :first-child {
    margin-top: 0;
  }

  .message-text > :last-child {
    margin-bottom: 0;
  }
`;