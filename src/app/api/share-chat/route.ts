import { NextRequest, NextResponse } from 'next/server';
import { mockConversations } from '@/data/mockConversations';

// Helper function to get conversation data directly from mock data
// This bypasses MSW which doesn't intercept server-side requests
function getConversationData(chatId: string): {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
} | null {
  try {
    // Find conversation in mock data
    const conversation = mockConversations.find(c => c.id === chatId);
    
    if (!conversation) {
      console.error(`Conversation ${chatId} not found in mock data`);
      return null;
    }

    // Serialize dates to ISO strings for export
    return {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })),
    };
  } catch (error) {
    console.error(`Error getting conversation ${chatId}:`, error);
    return null;
  }
}

// Helper function to generate export file
async function generateExportFile(
  chatId: string,
  format: string,
  baseUrl: string,
  title?: string,
  pinnedItems?: Array<{ id: string; content: string; title?: string; type: string }>,
  messageIds?: string[] | null
): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  try {
    let exportUrl: string;
    
    if (pinnedItems && pinnedItems.length > 0) {
      // Export pinned items
      const response = await fetch(`${baseUrl}/api/export-pinboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: format.toLowerCase(),
          title: title || 'Pin Board',
          items: pinnedItems,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to generate ${format} export for pinned items: ${response.statusText}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `pinboard.${format.toLowerCase()}`;
      if (format.toLowerCase() === 'image') filename = 'pinboard.png';
      if (format.toLowerCase() === 'excel') filename = 'pinboard.xlsx';
      if (format.toLowerCase() === 'csv') filename = 'pinboard.csv';
      if (format.toLowerCase() === 'md') filename = 'pinboard.md';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Use provided title if available
      if (title) {
        const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'pinboard';
        const ext = filename.split('.').pop() || format.toLowerCase();
        filename = `${sanitizedTitle}.${ext}`;
      }

      return {
        buffer,
        filename,
        mimeType: contentType,
      };
    } else {
      // Export conversation
      const messageIdsParam = messageIds && messageIds.length > 0 
        ? `&messageIds=${encodeURIComponent(JSON.stringify(messageIds))}` 
        : '';
      exportUrl = `${baseUrl}/api/export-chat?format=${format.toLowerCase()}&chatId=${chatId}${title ? `&title=${encodeURIComponent(title)}` : ''}${messageIdsParam}`;
      const response = await fetch(exportUrl);

      if (!response.ok) {
        console.error(`Failed to generate ${format} export: ${response.statusText}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `chat.${format.toLowerCase()}`;
      if (format.toLowerCase() === 'image') filename = 'chat.png';
      if (format.toLowerCase() === 'excel') filename = 'chat.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Use provided title if available
      if (title) {
        const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'chat';
        const ext = filename.split('.').pop() || format.toLowerCase();
        filename = `${sanitizedTitle}.${ext}`;
      }

      return {
        buffer,
        filename,
        mimeType: contentType,
      };
    }
  } catch (error) {
    console.error(`Error generating ${format} export:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, emails, message, includeChatLink, format, title, pinnedItems, isPinBoardExport, messageIds } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    // Validate chatId only if not exporting pinned items
    if (!isPinBoardExport && !chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Validate pinned items if exporting pinned items
    if (isPinBoardExport && (!pinnedItems || !Array.isArray(pinnedItems) || pinnedItems.length === 0)) {
      return NextResponse.json(
        { error: 'Pinned items are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e: string) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    let chatUrl: string | null = null;
    let chatTitle: string;

    if (isPinBoardExport) {
      // For pinned items export
      chatTitle = title || 'Pin Board';
    } else {
      // For conversation export
      chatUrl = `${baseUrl}/chat/${chatId}`;
      // Fetch conversation data to get title
      const conversation = getConversationData(chatId);
      chatTitle = title || conversation?.title || 'Chat';
    }

    // Generate export file if format is specified
    let attachment: { buffer: Buffer; filename: string; mimeType: string } | null = null;
    if (format) {
      attachment = await generateExportFile(
        chatId || '',
        format,
        baseUrl,
        chatTitle,
        isPinBoardExport ? pinnedItems : undefined,
        messageIds
      );
      if (!attachment) {
        return NextResponse.json(
          { error: `Failed to generate ${format} export file` },
          { status: 500 }
        );
      }
    }

    // Prepare email message
    let emailMessage = message || '';
    
    // Append chat link if requested (only for conversations, not pinned items)
    if (includeChatLink && chatUrl) {
      if (emailMessage) {
        emailMessage += '\n\n';
      }
      emailMessage += `View this chat: ${chatUrl}`;
    }

    // TODO: Implement actual email sending service (e.g., SendGrid, AWS SES, Nodemailer, etc.)
    // Here's the structure you would use:
    //
    // Example with Nodemailer:
    // const transporter = nodemailer.createTransport({
    //   // Your email service configuration
    // });
    //
    // const mailOptions = {
    //   from: 'your-email@example.com',
    //   to: emails.join(', '),
    //   subject: `Shared Chat: ${chatTitle}`,
    //   text: emailMessage,
    //   html: emailMessage.replace(/\n/g, '<br>'),
    //   attachments: attachment ? [{
    //     filename: attachment.filename,
    //     content: attachment.buffer,
    //     contentType: attachment.mimeType,
    //   }] : undefined,
    // };
    //
    // await transporter.sendMail(mailOptions);

    // For now, log the email details (in production, this would actually send the email)
    console.log('Email to be sent:', {
      to: emails,
      subject: isPinBoardExport ? `Shared Pin Board: ${chatTitle}` : `Shared Chat: ${chatTitle}`,
      message: emailMessage,
      attachment: attachment ? {
        filename: attachment.filename,
        size: attachment.buffer.length,
        mimeType: attachment.mimeType,
      } : null,
      chatUrl: includeChatLink && chatUrl ? chatUrl : null,
      isPinBoardExport,
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sharing chat:', error);
    return NextResponse.json(
      { error: 'Failed to share chat' },
      { status: 500 }
    );
  }
}

