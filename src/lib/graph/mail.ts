import { graphFetch } from "@/lib/graph/client";

export interface GraphMailItem {
  id: string;
  subject: string | null;
  bodyPreview: string | null;
  fromName: string | null;
  fromAddress: string | null;
  receivedDateTime: string;
  isRead: boolean;
  conversationId: string | null;
  /** Link that opens the message in Outlook on the web. */
  webLink: string | null;
}

interface GraphMessageDTO {
  id: string;
  subject?: string;
  bodyPreview?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime: string;
  isRead?: boolean;
  conversationId?: string;
  webLink?: string;
}

const MESSAGE_FIELDS =
  "id,subject,bodyPreview,from,receivedDateTime,isRead,conversationId,webLink";

export async function fetchRecentMail(accessToken: string, top = 25): Promise<GraphMailItem[]> {
  const res = await graphFetch(
    accessToken,
    `/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${MESSAGE_FIELDS}`,
  );
  const data = (await res.json()) as { value?: GraphMessageDTO[] };

  return (data.value ?? []).map((m) => ({
    id: m.id,
    subject: m.subject ?? null,
    bodyPreview: m.bodyPreview ?? null,
    fromName: m.from?.emailAddress?.name ?? null,
    fromAddress: m.from?.emailAddress?.address ?? null,
    receivedDateTime: m.receivedDateTime,
    isRead: Boolean(m.isRead),
    conversationId: m.conversationId ?? null,
    webLink: m.webLink ?? null,
  }));
}
