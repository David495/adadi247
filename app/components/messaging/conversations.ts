import {
  getOrCreateConversation,
} from "@/app/lib/messaging/supabase";
import {
  getMyConversations,
} from "@/app/lib/messaging/supabase";

export async function openBusinessConversation(
  businessId: string
) {
  return getOrCreateConversation(
    businessId
  );
}

export { getMyConversations };
