/**
 * Application-wide constants
 */

export const CONSTANTS = {
  // Conversation defaults
  DEFAULT_CONVERSATION_TITLE: 'New Chat',
  MAX_CONVERSATION_TITLE_LENGTH: 50,

  // Pagination
  INITIAL_DISPLAY_COUNT: 10,
  LOAD_MORE_COUNT: 10,

  // Textarea
  MAX_TEXTAREA_HEIGHT: 200,
  MIN_TEXTAREA_HEIGHT: 80,

  // Error messages
  ERROR_MESSAGES: {
    STREAMING_ERROR: 'Sorry, I encountered an error. Please try again.',
    SEND_MESSAGE_ERROR: 'Failed to send message',
    STREAM_MESSAGE_ERROR: 'Failed to stream message',
  },

  // Intersection Observer
  INTERSECTION_OBSERVER: {
    ROOT_MARGIN: '100px',
    THRESHOLD: 0.1,
  },
} as const;

