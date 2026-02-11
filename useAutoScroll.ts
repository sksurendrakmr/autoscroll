import { useRef, useEffect, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  isStreaming: boolean;
  messagesLength: number;
}

interface UseAutoScrollReturn {
  chatMessagesRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isAtBottom: boolean;
  showScrollButton: boolean;
  scrollToBottom: (smooth?: boolean) => void;
  handleScroll: () => void;
  handleScrollToBottom: () => void;
  setIsLoadingOldMessages: (loading: boolean) => void;
}

export const useAutoScroll = ({
  isStreaming,
  messagesLength,
}: UseAutoScrollOptions): UseAutoScrollReturn => {
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for scroll behavior
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isLoadingOldMessages, setIsLoadingOldMessages] = useState(false);

  // Intersection Observer to track if bottom is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsAtBottom(entry.isIntersecting);
        });
      },
      {
        root: chatMessagesRef.current,
        threshold: 0.1,
        rootMargin: '0px',
      }
    );

    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current);
    }

    return () => {
      if (messagesEndRef.current) {
        observer.unobserve(messagesEndRef.current);
      }
    };
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (shouldAutoScroll && isAtBottom) {
      requestAnimationFrame(() => {
        scrollToBottom(!isStreaming);
      });
    }
  }, [messagesLength, isStreaming, shouldAutoScroll, isAtBottom, scrollToBottom]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const container = chatMessagesRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const atBottom = scrollHeight - clientHeight <= scrollTop + 1;

    setIsAtBottom(atBottom);

    // Check if user manually scrolled up
    if (!atBottom && !isStreaming) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    }

    // If user scrolled to bottom manually, re-enable auto-scroll
    if (atBottom) {
      setShouldAutoScroll(true);
      // Delay marking user not scrolling to avoid button flicker
      scrollTimeoutRef.current = setTimeout(() => {
        if (atBottom) {
          setIsUserScrolling(false);
        }
      }, 150);
    }
  }, [isStreaming]);

  // Handle scroll button click
  const handleScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Determine if scroll button should be visible
  const showScrollButton = !isAtBottom && !isLoadingOldMessages && isUserScrolling;

  return {
    chatMessagesRef,
    messagesEndRef,
    isAtBottom,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    handleScrollToBottom,
    setIsLoadingOldMessages,
  };
};
