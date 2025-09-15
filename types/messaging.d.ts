/**
 * 消息类型
 */
type MessageType = "TEXT" | "IMAGE" | "VOICE" | "VIDEO" | "FILE" | "LINK";

/**
 * 消息状态
 */
type MessageStatus =
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "REVOKED"
  | "FAILED";

/**
 * 会话类型
 */
type ConversationType = "PRIVATE" | "GROUP";

// 消息DTO
interface MessageDTO {
  id: string;
  conversationId: number;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  type: MessageType;
  status?: MessageStatus;
  createdAt: string;
  readAt?: string | null;
  recalled: boolean;
  replyTo?: {
    messageId: string;
    preview: string;
    senderName: string;
  } | null;
}

// 会话DTO
interface ConversationDTO {
  id: string;
  type: ConversationType;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  partner?: {
    id: string;
    name: string;
    avatar: string;
  };
  lastMessage?: MessageDTO | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  isMuted: boolean;
  messages?: MessageDTO[];
}

// 系统通知DTO
interface NotificationDTO {
  id: string;
  title: string;
  content: string;
  type: "REGISTRATION" | "CERTIFICATION" | "ANNOUNCEMENT";
  isRead: boolean;
  createdAt: string;
}

type MessageNotificationType =
  | "ACK"
  | "NEW_MSG"
  | "MSG_RECALLED"
  | "MSG_READ"
  | "BATCH_MSG_READ"
  | "NOTIFICATION";

// WebSocket消息
interface WebSocketMessage {
  /**
   * 消息通知类型
   */
  type: MessageNotificationType;
  /**
   * 消息载荷
   */
  payload:
    | any
    | {
        /**
         * 消息 id
         */
        messageId: number;
        /**
         * 会话 id
         */
        conversationId?: number;
      };
}
// ======================消息模型=======================
/**
 * 发送消息请求
 */
interface SendMessageRequest {
  toUserId: number;
  content: Array<MessageContent>;
  type: MessageType;
  replyTo?: number;
}

/**
 * 消息内容
 */
interface MessageContent {
  /**
   * 消息临时 id
   */
  tempId: number;
  /**
   * 消息类型
   */
  type: MessageType;
  /**
   * 消息内容
   */
  content: string;
  /**
   * 消息 url
   */
  url?: string;
  /**
   * 消息负载
   */
  payload?: MessagePayload;
  /**
   * 文件上传进度
   */
  uploadProgress?: {
    /**
     * 上传进度百分比
     */
    percent: number;
    /**
     * 已上传字节数
     */
    loaded: number;
    /**
     * 总字节数
     */
    total: number;
    /**
     * 上传速度
     */
    speed?: number;
    /**
     * 剩余时间
     */
    remainingTime?: number;
    /**
     * 上传状态
     */
    status: "uploading" | "paused" | "completed" | "error" | "cancelled";
  };
}

/**
 * 消息负载
 */
interface MessagePayload {
  /**
   * 对象 key
   */
  key: string;
  /**
   * 文件名
   */
  fileName: string;
  /**
   * 文件大小
   */
  fileSize?: number;
  /**
   * 文件 url
   */
  url?: string;
}

// 撤回消息请求
interface RecallMessageRequest {
  messageId: number;
}

// 消息应答请求
interface AckRequest {
  messageIds: number[];
  type: MessageNotificationType;
  conversationId?: number;
}

/**
 *
 */
type ActionType = "ArrowRight";

/**
 * 消息菜单项
 */
type MenuItem = {
  label: string;
  icon: string;
  event: "recall" | "reply";
};

/**
 * 消息已读回执
 */
interface MessageReadReceipt {
  /**
   * 消息发送者 id
   */
  senderId: number;
  /**
   * 会话 id
   */
  conversationId: number;
  /**
   * 消息id 集合
   */
  messageIds: number[];
  /**
   * 通知类型
   */
  type: MessageNotificationType;
}

/**
 * 应答消息
 */
interface AckMessage {
  /**
   * 消息临时 id
   */
  tempId: number;
  /**
   * 消息真实 id
   */
  realId: number;
  /**
   * 会话 id
   */
  conversationId: number;
  /**
   * 通知类型
   */
  type: MessageNotificationType;
}

/**
 * 消息事件动作
 */
type MessageEventAction = "sendMessage";
