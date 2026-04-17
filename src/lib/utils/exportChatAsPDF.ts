/**
 * Exports the chat conversation as a PDF using the server-side API
 * @param conversationTitle - The title of the conversation to use as filename
 * @param chatId - Optional chat ID. If not provided, will try to get from URL
 * @param conversationData - Optional conversation data to send to server (for newly created chats)
 */
export async function exportChatAsPDF(
  conversationTitle: string = 'chat',
  chatId?: string,
  conversationData?: {
    id: string;
    title: string;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string | Date;
    }>;
  }
): Promise<void> {
  try {
    // Get chatId from URL if not provided
    let conversationId = chatId;
    if (!conversationId) {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/chat\/([^\/]+)/);
      if (match) {
        conversationId = match[1];
      } else {
        console.error('Chat ID not found in URL');
        alert('Failed to export chat as PDF: Chat ID not found.');
        return;
      }
    }

    // Sanitize filename: remove invalid characters and limit length
    const sanitizedTitle = conversationTitle
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .trim()
      .slice(0, 100) // Limit length
      || 'chat';

    // Call the server-side export API
    // If conversationData is provided, use POST to send it; otherwise use GET
    let response: Response;
    if (conversationData) {
      // Serialize conversation data for POST
      const serializedData = {
        ...conversationData,
        messages: conversationData.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
        })),
      };

      response = await fetch(`/api/export-chat?format=pdf&chatId=${conversationId}&title=${encodeURIComponent(sanitizedTitle)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationData: serializedData }),
      });
    } else {
      const downloadUrl = `/api/export-chat?format=pdf&chatId=${conversationId}&title=${encodeURIComponent(sanitizedTitle)}`;
      response = await fetch(downloadUrl);
    }

    if (!response.ok) {
      let errorMessage = 'Failed to export chat';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else if (contentType && contentType.includes('application/pdf')) {
          // If we get a PDF even though response is not ok, it might be a different issue
          errorMessage = 'Unexpected response format';
        } else {
          errorMessage = response.statusText || errorMessage;
        }
      } catch (parseError) {
        // If we can't parse the error, use status text
        errorMessage = response.statusText || `HTTP ${response.status}: ${errorMessage}`;
      }
      throw new Error(errorMessage);
    }

    // Convert response to blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedTitle}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chat as PDF:', error);
    alert(`Failed to export chat as PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

