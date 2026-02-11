import React, { useState, useCallback } from 'react';
import { useAutoScroll } from './useAutoScroll';
import './ChatAutoScroll.css';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isStreaming?: boolean;
}

interface ChatAutoScrollProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onNewChat: () => void;
  onLoadOldMessages: () => void;
}

export const ChatAutoScroll: React.FC<ChatAutoScrollProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onNewChat,
  onLoadOldMessages,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Use the custom auto-scroll hook
  const {
    chatMessagesRef,
    messagesEndRef,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    handleScrollToBottom,
    setIsLoadingOldMessages,
  } = useAutoScroll({
    isStreaming,
    messagesLength: messages.length,
  });

  // Handle send message
  const handleSendMessage = useCallback(() => {
    const message = inputValue.trim();
    if (!message || isStreaming) return;

    onSendMessage(message);
    setInputValue('');
    scrollToBottom(true);
  }, [inputValue, isStreaming, onSendMessage, scrollToBottom]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setIsLoadingOldMessages(false);
    onNewChat();
    setTimeout(() => scrollToBottom(false), 0);
  }, [onNewChat, scrollToBottom, setIsLoadingOldMessages]);

  // Handle load old messages
  const handleLoadOldMessages = useCallback(() => {
    setIsLoadingOldMessages(true);

    const container = chatMessagesRef.current;
    if (!container) return;

    const scrollHeightBefore = container.scrollHeight;
    const scrollTopBefore = container.scrollTop;

    onLoadOldMessages();

    // Maintain scroll position after loading
    requestAnimationFrame(() => {
      if (container) {
        const scrollHeightAfter = container.scrollHeight;
        const scrollDiff = scrollHeightAfter - scrollHeightBefore;
        container.scrollTop = scrollTopBefore + scrollDiff;

        setTimeout(() => {
          setIsLoadingOldMessages(false);
        }, 500);
      }
    });
  }, [onLoadOldMessages, chatMessagesRef, setIsLoadingOldMessages]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>AI Chat Interface</h1>
        <div className="chat-controls">
          <button className="btn" onClick={handleNewChat}>
            New Chat
          </button>
          <button className="btn" onClick={handleLoadOldMessages}>
            Load Old Messages
          </button>
        </div>
      </div>

      <div className="chat-messages-wrapper">
        <div
          className="chat-messages"
          ref={chatMessagesRef}
          onScroll={handleScroll}
        >
          <div className="demo-info">
            Try sending messages, scrolling up to see the floating button, and
            testing the auto-scroll behavior!
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}${
                message.isStreaming ? ' streaming' : ''
              }`}
            >
              <div className="role">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="content">{message.content}</div>
            </div>
          ))}

          <div className="scroll-anchor" ref={messagesEndRef} />
        </div>

        <button
          className={`scroll-to-bottom-btn${showScrollButton ? ' visible' : ''}`}
          onClick={handleScrollToBottom}
        >
          <span>Scroll to bottom</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            className="chat-input"
            placeholder="Type your message..."
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={isStreaming || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
