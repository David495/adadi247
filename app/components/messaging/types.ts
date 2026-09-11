export type MessageStatus =
  | "sending"
  | "sent"
  | "failed";

export type MessagingConversation = {
  id: string;
  customerId: string;
  businessId: string;
  businessOwnerId: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  customerName?: string;
  customerAvatarUrl?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type MessagingMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  plaintext: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  status: MessageStatus;
};

export type MessageDeliveryState =
  | "sending"
  | "sent"
  | "failed";

export type ConversationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: "customer" | "business";
};

export type SendMessageInput = {
  conversationId: string;
  plaintext: string;
};

export type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
};

export type MessageBubbleProps = {
  message: MessagingMessage;
  isOwnMessage: boolean;
  onRetry?: (message: MessagingMessage) => void | Promise<void>;
};

export type ConversationListItemProps = {
  conversation: MessagingConversation;
  selected?: boolean;
  onClick?: () => void;
};

export type ConversationListProps = {
  conversations: MessagingConversation[];
  selectedConversationId?: string | null;
  onSelectConversation: (
    conversation: MessagingConversation
  ) => void;
  loading?: boolean;
};

export type ChatWindowProps = {
  conversation: MessagingConversation | null;
  messages: MessagingMessage[];
  currentUserId: string;
  onSendMessage: (
    plaintext: string
  ) => void | Promise<void>;
  onRetryMessage?: (
    message: MessagingMessage
  ) => void | Promise<void>;
  loading?: boolean;
  sending?: boolean;
};