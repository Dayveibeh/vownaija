import { ensureDatabaseSchema, getSql } from "@/db";
import { ensureMarketplaceSeed } from "@/lib/marketplace";

export type EnquiryInput = {
  vendorId: string;
  packageId?: string | null;
  requestedService?: string | null;
  weddingDate?: string | null;
  weddingLocation: string;
  guestCount?: string | null;
  budgetBand?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  message: string;
};

export type ConversationSummary = {
  id: string;
  enquiryId: string;
  vendorId: string;
  vendorName: string;
  vendorImage: string;
  customerName: string;
  customerEmail: string;
  lastMessageAt: string;
  lastMessage: string;
  unreadCount: number;
  status: string;
  requestedService: string | null;
  weddingDate: string | null;
  weddingLocation: string;
  guestCount: string | null;
  budgetBand: string | null;
};

export type ConversationDetail = ConversationSummary & {
  enquiryMessage: string;
  packageTitle: string | null;
  messages: Array<{
    id: string;
    senderClerkUserId: string;
    senderName: string;
    body: string;
    createdAt: string;
    mine: boolean;
  }>;
};

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}

function asDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function createEnquiry(customerClerkUserId: string, input: EnquiryInput) {
  await ensureMarketplaceSeed();
  const sql = getSql();
  const vendorRows = await sql`
    SELECT id, business_name, owner_clerk_user_id
    FROM marketplace_vendors
    WHERE id = ${input.vendorId} AND active = true
    LIMIT 1
  `;
  const vendor = vendorRows[0];
  if (!vendor) throw new Error("VENDOR_NOT_FOUND");

  if (input.packageId) {
    const packageRows = await sql`
      SELECT id FROM vendor_packages
      WHERE id = ${input.packageId} AND vendor_id = ${input.vendorId}
      LIMIT 1
    `;
    if (!packageRows[0]) throw new Error("PACKAGE_NOT_FOUND");
  }

  const enquiryId = crypto.randomUUID();
  const conversationId = crypto.randomUUID();
  const firstMessageId = crypto.randomUUID();
  const now = new Date();

  await sql`
    INSERT INTO enquiries (
      id, customer_clerk_user_id, vendor_id, package_id, requested_service,
      wedding_date, wedding_location, guest_count, budget_band, contact_name, contact_email, message, status,
      created_at, updated_at
    ) VALUES (
      ${enquiryId}, ${customerClerkUserId}, ${input.vendorId}, ${input.packageId ?? null},
      ${input.requestedService ?? null}, ${input.weddingDate || null}, ${input.weddingLocation},
      ${input.guestCount ?? null}, ${input.budgetBand ?? null}, ${input.contactName ?? null}, ${input.contactEmail ?? null}, ${input.message}, 'new',
      ${now}, ${now}
    )
  `;

  await sql`
    INSERT INTO conversations (
      id, enquiry_id, customer_clerk_user_id, vendor_id, vendor_owner_clerk_user_id,
      last_message_at, customer_last_read_at, created_at, updated_at
    ) VALUES (
      ${conversationId}, ${enquiryId}, ${customerClerkUserId}, ${input.vendorId},
      ${vendor.owner_clerk_user_id ?? null}, ${now}, ${now}, ${now}, ${now}
    )
  `;

  await sql`
    INSERT INTO messages (id, conversation_id, sender_clerk_user_id, body, created_at)
    VALUES (${firstMessageId}, ${conversationId}, ${customerClerkUserId}, ${input.message}, ${now})
  `;

  return {
    enquiryId,
    conversationId,
    vendorAssigned: Boolean(vendor.owner_clerk_user_id),
    vendorName: String(vendor.business_name),
  };
}

export async function listConversationSummaries(clerkUserId: string, role: "couple" | "vendor" | "admin") {
  await ensureDatabaseSchema();
  await ensureMarketplaceSeed();
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.id,
      c.enquiry_id,
      c.vendor_id,
      mv.business_name AS vendor_name,
      mv.image_url AS vendor_image,
      COALESCE(e.contact_name, customer.full_name) AS customer_name,
      COALESCE(e.contact_email, customer.email) AS customer_email,
      c.last_message_at,
      e.status,
      e.requested_service,
      e.wedding_date,
      e.wedding_location,
      e.guest_count,
      e.budget_band,
      COALESCE((
        SELECT body FROM messages latest
        WHERE latest.conversation_id = c.id
        ORDER BY latest.created_at DESC
        LIMIT 1
      ), '') AS last_message,
      (
        SELECT COUNT(*)::int
        FROM messages unread
        WHERE unread.conversation_id = c.id
          AND unread.sender_clerk_user_id <> ${clerkUserId}
          AND unread.created_at > COALESCE(
            CASE WHEN ${role} = 'couple' THEN c.customer_last_read_at ELSE c.vendor_last_read_at END,
            to_timestamp(0)
          )
      ) AS unread_count
    FROM conversations c
    JOIN enquiries e ON e.id = c.enquiry_id
    JOIN marketplace_vendors mv ON mv.id = c.vendor_id
    JOIN smitten_users customer ON customer.clerk_user_id = c.customer_clerk_user_id
    WHERE (
      (${role} = 'couple' AND c.customer_clerk_user_id = ${clerkUserId})
      OR
      (${role} <> 'couple' AND c.vendor_owner_clerk_user_id = ${clerkUserId})
    )
    ORDER BY c.last_message_at DESC
  `;

  return rows.map((row): ConversationSummary => ({
    id: String(row.id),
    enquiryId: String(row.enquiry_id),
    vendorId: String(row.vendor_id),
    vendorName: String(row.vendor_name),
    vendorImage: String(row.vendor_image),
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    lastMessageAt: asIso(row.last_message_at),
    lastMessage: String(row.last_message ?? ""),
    unreadCount: Number(row.unread_count ?? 0),
    status: String(row.status),
    requestedService: row.requested_service ? String(row.requested_service) : null,
    weddingDate: asDate(row.wedding_date),
    weddingLocation: String(row.wedding_location),
    guestCount: row.guest_count ? String(row.guest_count) : null,
    budgetBand: row.budget_band ? String(row.budget_band) : null,
  }));
}

export async function getConversationDetail(conversationId: string, clerkUserId: string, role: "couple" | "vendor" | "admin") {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.id,
      c.enquiry_id,
      c.vendor_id,
      c.customer_clerk_user_id,
      c.vendor_owner_clerk_user_id,
      c.last_message_at,
      mv.business_name AS vendor_name,
      mv.image_url AS vendor_image,
      COALESCE(e.contact_name, customer.full_name) AS customer_name,
      COALESCE(e.contact_email, customer.email) AS customer_email,
      e.status,
      e.requested_service,
      e.wedding_date,
      e.wedding_location,
      e.guest_count,
      e.budget_band,
      e.message AS enquiry_message,
      vp.title AS package_title
    FROM conversations c
    JOIN enquiries e ON e.id = c.enquiry_id
    JOIN marketplace_vendors mv ON mv.id = c.vendor_id
    JOIN smitten_users customer ON customer.clerk_user_id = c.customer_clerk_user_id
    LEFT JOIN vendor_packages vp ON vp.id = e.package_id
    WHERE c.id = ${conversationId}
      AND (c.customer_clerk_user_id = ${clerkUserId} OR c.vendor_owner_clerk_user_id = ${clerkUserId})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const messageRows = await sql`
    SELECT m.id, m.sender_clerk_user_id, m.body, m.created_at, u.full_name AS sender_name
    FROM messages m
    JOIN smitten_users u ON u.clerk_user_id = m.sender_clerk_user_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;

  const now = new Date();
  if (role === "couple") {
    await sql`UPDATE conversations SET customer_last_read_at = ${now}, updated_at = ${now} WHERE id = ${conversationId}`;
  } else {
    await sql`UPDATE conversations SET vendor_last_read_at = ${now}, updated_at = ${now} WHERE id = ${conversationId}`;
    await sql`UPDATE enquiries SET status = CASE WHEN status = 'new' THEN 'active' ELSE status END, updated_at = ${now} WHERE id = ${row.enquiry_id}`;
  }

  const lastMessage = messageRows.length ? String(messageRows[messageRows.length - 1].body) : "";

  return {
    id: String(row.id),
    enquiryId: String(row.enquiry_id),
    vendorId: String(row.vendor_id),
    vendorName: String(row.vendor_name),
    vendorImage: String(row.vendor_image),
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    lastMessageAt: asIso(row.last_message_at),
    lastMessage,
    unreadCount: 0,
    status: String(row.status),
    requestedService: row.requested_service ? String(row.requested_service) : null,
    weddingDate: asDate(row.wedding_date),
    weddingLocation: String(row.wedding_location),
    guestCount: row.guest_count ? String(row.guest_count) : null,
    budgetBand: row.budget_band ? String(row.budget_band) : null,
    enquiryMessage: String(row.enquiry_message),
    packageTitle: row.package_title ? String(row.package_title) : null,
    messages: messageRows.map((message) => ({
      id: String(message.id),
      senderClerkUserId: String(message.sender_clerk_user_id),
      senderName: String(message.sender_name),
      body: String(message.body),
      createdAt: asIso(message.created_at),
      mine: String(message.sender_clerk_user_id) === clerkUserId,
    })),
  } satisfies ConversationDetail;
}

export async function sendConversationMessage(conversationId: string, clerkUserId: string, body: string) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const membership = await sql`
    SELECT id, enquiry_id, customer_clerk_user_id, vendor_owner_clerk_user_id
    FROM conversations
    WHERE id = ${conversationId}
      AND (customer_clerk_user_id = ${clerkUserId} OR vendor_owner_clerk_user_id = ${clerkUserId})
    LIMIT 1
  `;
  const conversation = membership[0];
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  const id = crypto.randomUUID();
  const now = new Date();
  await sql`
    INSERT INTO messages (id, conversation_id, sender_clerk_user_id, body, created_at)
    VALUES (${id}, ${conversationId}, ${clerkUserId}, ${body}, ${now})
  `;
  await sql`
    UPDATE conversations
    SET last_message_at = ${now}, updated_at = ${now},
        customer_last_read_at = CASE WHEN customer_clerk_user_id = ${clerkUserId} THEN ${now} ELSE customer_last_read_at END,
        vendor_last_read_at = CASE WHEN vendor_owner_clerk_user_id = ${clerkUserId} THEN ${now} ELSE vendor_last_read_at END
    WHERE id = ${conversationId}
  `;
  await sql`
    UPDATE enquiries
    SET status = 'active', updated_at = ${now}
    WHERE id = ${conversation.enquiry_id}
  `;

  return { id, createdAt: now.toISOString() };
}
