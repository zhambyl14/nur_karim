export type ChatMessage = {
  id: string;
  body: string;
  is_admin: boolean;
  sender_id: string | null;
  created_at: string;
};

export const MESSAGE_MAX_LENGTH = 4000;

export type SendMessageResult = { ok: true; message: ChatMessage } | { ok: false; error: string };
export type StartConversationResult = { ok: true; id: string } | { ok: false; error: string };

export const MESSAGE_COLUMNS = "id, body, is_admin, sender_id, created_at";
