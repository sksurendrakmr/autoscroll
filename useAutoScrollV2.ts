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

/**
 * Custom hook for auto-scroll behavior in chat interfaces
 * 
 * Key Features:
 * - Uses Intersection Observer as single source of truth for "at bottom" state
 * - Leverages scrollIntoView for scrolling (no manual calculations)
 * - No timers needed
 * - Minimal state management
 * 
 * @param isStreaming - Whether AI is currently streaming a response
 * @param messagesLength - Number of messages (triggers auto-scroll on change)
 * @returns Object containing refs, state, and handler functions
 */
export const useAutoScroll = ({
  isStreaming,
  messagesLength,
}: UseAutoScrollOptions): UseAutoScrollReturn => {
  // Refs
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammaticallyRef = useRef(false);

  // State for scroll behavior
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isLoadingOldMessages, setIsLoadingOldMessages] = useState(false);

  // Intersection Observer - Single source of truth for "at bottom" detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasAtBottom = isAtBottom;
          const nowAtBottom = entry.isIntersecting;
          
          setIsAtBottom(nowAtBottom);

          // When user reaches bottom (and not from programmatic scroll)
          // Re-enable auto-scroll and hide the scroll button
          if (!wasAtBottom && nowAtBottom && !isScrollingProgrammaticallyRef.current) {
            setShouldAutoScroll(true);
            setIsUserScrolling(false);
          }
        });
      },
      {
        root: chatMessagesRef.current,
        threshold: 0.1, // Trigger when 10% of anchor is visible
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
  }, [isAtBottom]);

  /**
   * Scroll to bottom using scrollIntoView on the anchor element
   * No manual scroll calculations needed - browser handles it
   */
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      // Mark as programmatic scroll to prevent Intersection Observer conflicts
      isScrollingProgrammaticallyRef.current = true;
      
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',      // Align to bottom of scroll container
        inline: 'nearest', // Don't affect horizontal scroll
      });

      // Reset flag after scroll animation completes
      // Smooth scrolling takes ~500ms, instant is immediate
      setTimeout(() => {
        isScrollingProgrammaticallyRef.current = false;
      }, smooth ? 500 : 0);
    }
  }, []);

  /**
   * Auto-scroll when messages change
   * Only scrolls if user is at bottom and auto-scroll is enabled
   */
  useEffect(() => {
    if (shouldAutoScroll && isAtBottom) {
      requestAnimationFrame(() => {
        // Use instant scroll during streaming for smoother experience
        scrollToBottom(!isStreaming);
      });
    }
  }, [messagesLength, isStreaming, shouldAutoScroll, isAtBottom, scrollToBottom]);

  /**
   * Handle scroll events - Simplified version
   * No manual calculations - leverages isAtBottom from Intersection Observer
   */
  const handleScroll = useCallback(() => {
    // Skip if we're programmatically scrolling (avoid state conflicts)
    if (isScrollingProgrammaticallyRef.current) {
      return;
    }

    // If user scrolls while NOT at bottom, mark as manual scrolling
    // This disables auto-scroll and shows the scroll button
    if (!isAtBottom && !isStreaming) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    }
  }, [isAtBottom, isStreaming]);

  /**
   * Handle scroll button click
   * Re-enables auto-scroll and scrolls to bottom
   */
  const handleScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Show scroll button only when:
  // 1. User is NOT at bottom
  // 2. Not loading old messages
  // 3. User has manually scrolled up
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
