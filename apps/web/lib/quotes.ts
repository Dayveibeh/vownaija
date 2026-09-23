import { ensureDatabaseSchema, getSql } from "@/db";

export type QuoteView = {
  id: string; conversationId: string; enquiryId: string; vendorId: string;
  vendorName: string; customerName: string; title: string; notes: string | null;
  subtotal: number; discountAmount: number; additionalFees: number; total: number;
  currencyCode: "NGN"; validUntil: string | null; revision: number;
  status: "sent" | "viewed" | "accepted" | "declined" | "expired";
  bookingId: string | null;
  sentAt: string; viewedAt: string | null; respondedAt: string | null;
  items: Array<{ id: string; title: string; description: string | null; quantity: number; unitPrice: number; lineTotal: number }>;
};

export type BookingView = {
  id: string; quoteId: string; conversationId: string; enquiryId: string; vendorId: string;
  vendorName: string; customerName: string; weddingDate: string | null; weddingLocation: string;
  serviceSummary: string; total: number; currencyCode: "NGN";
  status: "confirmed" | "completed" | "cancelled"; confirmedAt: string;
};

const money = (v: unknown) => Number(v ?? 0);
const dateOnly = (v: unknown) => v ? String(v).slice(0, 10) : null;
const iso = (v: unknown) => v ? new Date(String(v)).toISOString() : null;

async function mapQuote(row: Record<string, unknown>): Promise<QuoteView> {
  const sql = getSql();
  const items = await sql`
    SELECT id,title,description,quantity,unit_price,line_total
    FROM quote_items WHERE quote_id=${String(row.id)}
    ORDER BY display_order, created_at
  `;
  const bookingRows = await sql`SELECT id FROM bookings WHERE quote_id=${String(row.id)} LIMIT 1`;
  return {
    id:String(row.id), conversationId:String(row.conversation_id), enquiryId:String(row.enquiry_id),
    vendorId:String(row.vendor_id), vendorName:String(row.vendor_name), customerName:String(row.customer_name),
    title:String(row.title), notes:row.notes ? String(row.notes) : null,
    subtotal:money(row.subtotal), discountAmount:money(row.discount_amount), additionalFees:money(row.additional_fees),
    total:money(row.total), currencyCode:"NGN", validUntil:dateOnly(row.valid_until), revision:Number(row.revision),
    status:String(row.status) as QuoteView["status"], bookingId: bookingRows[0] ? String(bookingRows[0].id) : null, sentAt:iso(row.sent_at) ?? new Date().toISOString(),
    viewedAt:iso(row.viewed_at), respondedAt:iso(row.responded_at),
    items:items.map(i=>({id:String(i.id),title:String(i.title),description:i.description?String(i.description):null,quantity:Number(i.quantity),unitPrice:money(i.unit_price),lineTotal:money(i.line_total)})),
  };
}

function mapBooking(row: Record<string, unknown>): BookingView {
  return {
    id:String(row.id), quoteId:String(row.quote_id), conversationId:String(row.conversation_id),
    enquiryId:String(row.enquiry_id), vendorId:String(row.vendor_id), vendorName:String(row.vendor_name),
    customerName:String(row.customer_name), weddingDate:dateOnly(row.wedding_date),
    weddingLocation:String(row.wedding_location), serviceSummary:String(row.service_summary),
    total:money(row.total), currencyCode:"NGN", status:String(row.status) as BookingView["status"],
    confirmedAt:iso(row.confirmed_at) ?? new Date().toISOString(),
  };
}

export async function loadConversationQuotes(conversationId:string,userId:string,role:"couple"|"vendor"|"admin") {
  await ensureDatabaseSchema();
  const sql=getSql();
  const access=await sql`
    SELECT id FROM conversations WHERE id=${conversationId}
    AND (customer_clerk_user_id=${userId} OR vendor_owner_clerk_user_id=${userId}) LIMIT 1
  `;
  if(!access[0]) throw new Error("CONVERSATION_NOT_FOUND");
  const now=new Date();
  if(role==="couple") await sql`
    UPDATE quotes SET status=CASE WHEN status='sent' THEN 'viewed' ELSE status END,
    viewed_at=CASE WHEN status='sent' AND viewed_at IS NULL THEN ${now} ELSE viewed_at END,
    updated_at=CASE WHEN status='sent' THEN ${now} ELSE updated_at END
    WHERE conversation_id=${conversationId} AND customer_clerk_user_id=${userId}
  `;
  await sql`
    UPDATE quotes SET status='expired', updated_at=${now}
    WHERE conversation_id=${conversationId} AND status IN ('sent','viewed')
    AND valid_until IS NOT NULL AND valid_until<CURRENT_DATE
  `;
  const rows=await sql`
    SELECT q.*,mv.business_name vendor_name,COALESCE(e.contact_name,u.full_name) customer_name
    FROM quotes q JOIN marketplace_vendors mv ON mv.id=q.vendor_id
    JOIN enquiries e ON e.id=q.enquiry_id JOIN smitten_users u ON u.clerk_user_id=q.customer_clerk_user_id
    WHERE q.conversation_id=${conversationId} ORDER BY q.sent_at
  `;
  const out:QuoteView[]=[]; for(const row of rows) out.push(await mapQuote(row as Record<string,unknown>)); return out;
}

export async function createConversationQuote(conversationId:string,vendorUserId:string,input:{
  title:string; notes?:string|null; validUntil?:string|null; discountAmount?:number; additionalFees?:number;
  items:Array<{title:string;description?:string|null;quantity:number;unitPrice:number}>;
}) {
  await ensureDatabaseSchema(); const sql=getSql();
  const rows=await sql`
    SELECT c.enquiry_id,c.vendor_id,c.customer_clerk_user_id
    FROM conversations c WHERE c.id=${conversationId} AND c.vendor_owner_clerk_user_id=${vendorUserId} LIMIT 1
  `;
  const c=rows[0]; if(!c) throw new Error("CONVERSATION_NOT_FOUND");
  const booked=await sql`SELECT id FROM bookings WHERE conversation_id=${conversationId} LIMIT 1`;
  if(booked[0]) throw new Error("CONVERSATION_BOOKED");
  const items=input.items.map(i=>({title:i.title.trim(),description:i.description?.trim()||null,quantity:Math.max(1,Math.floor(i.quantity)),unitPrice:Math.max(0,i.unitPrice)}));
  const subtotal=items.reduce((s,i)=>s+i.quantity*i.unitPrice,0);
  const discount=Math.min(Math.max(0,input.discountAmount??0),subtotal), fees=Math.max(0,input.additionalFees??0), total=subtotal-discount+fees;
  if(total<=0) throw new Error("INVALID_TOTAL");
  const rev=await sql`SELECT COALESCE(MAX(revision),0)::int revision FROM quotes WHERE conversation_id=${conversationId}`;
  const id=crypto.randomUUID(), now=new Date();
  await sql`
    INSERT INTO quotes(id,conversation_id,enquiry_id,vendor_id,vendor_owner_clerk_user_id,customer_clerk_user_id,title,notes,subtotal,discount_amount,additional_fees,total,currency_code,valid_until,revision,status,sent_at,created_at,updated_at)
    VALUES(${id},${conversationId},${String(c.enquiry_id)},${String(c.vendor_id)},${vendorUserId},${String(c.customer_clerk_user_id)},${input.title.trim()},${input.notes?.trim()||null},${subtotal},${discount},${fees},${total},'NGN',${input.validUntil||null},${Number(rev[0]?.revision??0)+1},'sent',${now},${now},${now})
  `;
  for(let n=0;n<items.length;n++){const i=items[n]; await sql`
    INSERT INTO quote_items(id,quote_id,title,description,quantity,unit_price,line_total,display_order)
    VALUES(${crypto.randomUUID()},${id},${i.title},${i.description},${i.quantity},${i.unitPrice},${i.quantity*i.unitPrice},${n})
  `;}
  await sql`UPDATE conversations SET last_message_at=${now},vendor_last_read_at=${now},updated_at=${now} WHERE id=${conversationId}`;
  return (await loadConversationQuotes(conversationId,vendorUserId,"vendor")).find(q=>q.id===id)!;
}

export async function respondToQuote(quoteId:string,customerUserId:string,action:"accept"|"decline") {
  await ensureDatabaseSchema(); const sql=getSql();
  const rows=await sql`
    SELECT q.*,e.wedding_date,e.wedding_location,mv.business_name vendor_name,COALESCE(e.contact_name,u.full_name) customer_name
    FROM quotes q JOIN enquiries e ON e.id=q.enquiry_id JOIN marketplace_vendors mv ON mv.id=q.vendor_id
    JOIN smitten_users u ON u.clerk_user_id=q.customer_clerk_user_id
    WHERE q.id=${quoteId} AND q.customer_clerk_user_id=${customerUserId} LIMIT 1
  `;
  const q=rows[0]; if(!q) throw new Error("QUOTE_NOT_FOUND");
  if(!["sent","viewed"].includes(String(q.status))) throw new Error("QUOTE_ALREADY_RESPONDED");
  if(action==="accept" && q.valid_until && dateOnly(q.valid_until)! < new Date().toISOString().slice(0,10)){await sql`UPDATE quotes SET status='expired',updated_at=now() WHERE id=${quoteId}`;throw new Error("QUOTE_EXPIRED");}
  const now=new Date();
  if(action==="decline"){
    await sql`UPDATE quotes SET status='declined',responded_at=${now},updated_at=${now} WHERE id=${quoteId} AND status IN ('sent','viewed')`;
    await sql`UPDATE conversations SET last_message_at=${now},customer_last_read_at=${now},updated_at=${now} WHERE id=${String(q.conversation_id)}`;
    return {booking:null};
  }
  const existing=await sql`SELECT id FROM bookings WHERE conversation_id=${String(q.conversation_id)} LIMIT 1`; if(existing[0]) throw new Error("CONVERSATION_BOOKED");
  const updated=await sql`UPDATE quotes SET status='accepted',responded_at=${now},updated_at=${now} WHERE id=${quoteId} AND status IN ('sent','viewed') RETURNING id`; if(!updated[0]) throw new Error("QUOTE_ALREADY_RESPONDED");
  const bookingId=crypto.randomUUID();
  await sql`
    INSERT INTO bookings(id,quote_id,conversation_id,enquiry_id,vendor_id,vendor_owner_clerk_user_id,customer_clerk_user_id,wedding_date,wedding_location,service_summary,total,currency_code,status,confirmed_at,created_at,updated_at)
    VALUES(${bookingId},${quoteId},${String(q.conversation_id)},${String(q.enquiry_id)},${String(q.vendor_id)},${String(q.vendor_owner_clerk_user_id)},${customerUserId},${dateOnly(q.wedding_date)},${String(q.wedding_location)},${String(q.title)},${money(q.total)},'NGN','confirmed',${now},${now},${now})
  `;
  await sql`UPDATE quotes SET status='declined',responded_at=COALESCE(responded_at,${now}),updated_at=${now} WHERE conversation_id=${String(q.conversation_id)} AND id<>${quoteId} AND status IN ('sent','viewed')`;
  await sql`UPDATE enquiries SET status='closed',updated_at=${now} WHERE id=${String(q.enquiry_id)}`;
  await sql`UPDATE conversations SET last_message_at=${now},customer_last_read_at=${now},updated_at=${now} WHERE id=${String(q.conversation_id)}`;
  return {booking:mapBooking({...q,id:bookingId,quote_id:quoteId,status:"confirmed",service_summary:q.title,confirmed_at:now} as Record<string,unknown>)};
}

export async function listAccountQuotes(userId:string,role:"couple"|"vendor"|"admin") {
  await ensureDatabaseSchema(); const rows=await getSql()`
    SELECT q.*,mv.business_name vendor_name,COALESCE(e.contact_name,u.full_name) customer_name
    FROM quotes q JOIN marketplace_vendors mv ON mv.id=q.vendor_id JOIN enquiries e ON e.id=q.enquiry_id JOIN smitten_users u ON u.clerk_user_id=q.customer_clerk_user_id
    WHERE ((${role}='couple' AND q.customer_clerk_user_id=${userId}) OR (${role}<>'couple' AND q.vendor_owner_clerk_user_id=${userId}))
    ORDER BY q.sent_at DESC
  `; const out:QuoteView[]=[]; for(const row of rows) out.push(await mapQuote(row as Record<string,unknown>)); return out;
}

export async function listAccountBookings(userId:string,role:"couple"|"vendor"|"admin") {
  await ensureDatabaseSchema(); const rows=await getSql()`
    SELECT b.*,mv.business_name vendor_name,COALESCE(e.contact_name,u.full_name) customer_name
    FROM bookings b JOIN marketplace_vendors mv ON mv.id=b.vendor_id JOIN enquiries e ON e.id=b.enquiry_id JOIN smitten_users u ON u.clerk_user_id=b.customer_clerk_user_id
    WHERE ((${role}='couple' AND b.customer_clerk_user_id=${userId}) OR (${role}<>'couple' AND b.vendor_owner_clerk_user_id=${userId}))
    ORDER BY b.confirmed_at DESC
  `; return rows.map(r=>mapBooking(r as Record<string,unknown>));
}


export async function getQuoteForAccount(
  quoteId: string,
  userId: string,
  role: "couple" | "vendor" | "admin",
) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      q.*,
      mv.business_name AS vendor_name,
      COALESCE(e.contact_name, u.full_name) AS customer_name
    FROM quotes q
    JOIN marketplace_vendors mv ON mv.id = q.vendor_id
    JOIN enquiries e ON e.id = q.enquiry_id
    JOIN smitten_users u ON u.clerk_user_id = q.customer_clerk_user_id
    WHERE q.id = ${quoteId}
      AND (
        (${role} = 'couple' AND q.customer_clerk_user_id = ${userId})
        OR
        (${role} <> 'couple' AND q.vendor_owner_clerk_user_id = ${userId})
      )
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapQuote(rows[0] as Record<string, unknown>);
}


export async function getBookingForAccount(
  bookingId: string,
  userId: string,
  role: "couple" | "vendor" | "admin",
) {
  await ensureDatabaseSchema();
  const rows = await getSql()`
    SELECT
      b.*,
      mv.business_name AS vendor_name,
      COALESCE(e.contact_name, u.full_name) AS customer_name
    FROM bookings b
    JOIN marketplace_vendors mv ON mv.id = b.vendor_id
    JOIN enquiries e ON e.id = b.enquiry_id
    JOIN smitten_users u ON u.clerk_user_id = b.customer_clerk_user_id
    WHERE b.id = ${bookingId}
      AND (
        (${role} = 'couple' AND b.customer_clerk_user_id = ${userId})
        OR
        (${role} <> 'couple' AND b.vendor_owner_clerk_user_id = ${userId})
      )
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapBooking(rows[0] as Record<string, unknown>);
}
