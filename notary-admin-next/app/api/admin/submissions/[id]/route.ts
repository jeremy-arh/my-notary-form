import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: sub, error: subError } = await supabase
      .from("submission")
      .select("*")
      .eq("id", id)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    const rawData = sub.data;
    const parsedData =
      typeof rawData === "string" ? (() => { try { return JSON.parse(rawData); } catch { return rawData; } })() : rawData;

    const subData = parsedData as {
      selected_services?: string[];
      selectedServices?: string[];
      documents?: Record<string, { name?: string; url?: string; path?: string; public_url?: string; file_url?: string; storage_path?: string; selectedOptions?: string[] }[]>;
      serviceDocuments?: Record<string, { name?: string; url?: string; path?: string; public_url?: string; file_url?: string; storage_path?: string; selectedOptions?: string[] }[]>;
    } | null;

    const [
      servicesCatalogRes,
      optionsCatalogRes,
      servicesJunctionRes,
      optionsJunctionRes,
      clientRes,
      timelineRes,
      notesRes,
      filesRes,
    ] = await Promise.all([
      supabase.from("services").select("id, name, base_price, service_id").eq("is_active", true),
      supabase.from("options").select("id, name, additional_price, option_id").eq("is_active", true),
      supabase
        .from("submission_services")
        .select("id, services(name, base_price, service_id)")
        .eq("submission_id", id),
      supabase
        .from("submission_options")
        .select("id, options(name, additional_price, option_id)")
        .eq("submission_id", id),
      sub.client_id
        ? supabase
            .from("client")
            .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
            .eq("id", sub.client_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from("submission_activity_log")
        .select("id, action_type, action_description, created_at")
        .eq("submission_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("submission_internal_notes")
        .select("id, content, created_at")
        .eq("submission_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("submission_files")
        .select("id, file_name, file_url, storage_path")
        .eq("submission_id", id),
    ]);

    const clientId = sub.client_id as string | null;
    const emailSelect = "id, email, recipient_name, email_type, subject, sent_at, delivered_at, opened_at, clicked_at, clicked_url, bounced_at, dropped_at, submission_id";
    const smsSelect = "id, phone_number, recipient_name, sms_type, message, sent_at, delivered_at, failed_at, submission_id";

    const [signatoriesSettled, emailsBySubSettled, emailsByClientSettled, smsBySubSettled, smsByClientSettled] = await Promise.allSettled([
      supabase
        .from("signatories")
        .select("id, document_key, first_name, last_name, birth_date, birth_city, postal_address, email, phone")
        .eq("submission_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("email_sent")
        .select(emailSelect)
        .eq("submission_id", id)
        .order("sent_at", { ascending: false }),
      clientId
        ? supabase
            .from("email_sent")
            .select(emailSelect)
            .eq("client_id", clientId)
            .neq("submission_id", id)
            .order("sent_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("sms_sent")
        .select(smsSelect)
        .eq("submission_id", id)
        .order("sent_at", { ascending: false }),
      clientId
        ? supabase
            .from("sms_sent")
            .select(smsSelect)
            .eq("client_id", clientId)
            .neq("submission_id", id)
            .order("sent_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    const signatoriesRes = signatoriesSettled.status === "fulfilled" ? signatoriesSettled.value : { data: [] };
    const emailsBySubRes = emailsBySubSettled.status === "fulfilled" ? emailsBySubSettled.value : { data: [] };
    const emailsByClientRes = emailsByClientSettled.status === "fulfilled" ? emailsByClientSettled.value : { data: [] };
    const smsBySubRes = smsBySubSettled.status === "fulfilled" ? smsBySubSettled.value : { data: [] };
    const smsByClientRes = smsByClientSettled.status === "fulfilled" ? smsByClientSettled.value : { data: [] };

    type EmailRow = { id: string; email: string; recipient_name?: string; email_type: string; subject: string; sent_at: string; delivered_at?: string; opened_at?: string; clicked_at?: string; clicked_url?: string; bounced_at?: string; dropped_at?: string; submission_id?: string };
    type SmsRow = { id: string; phone_number: string; recipient_name?: string; sms_type: string; message: string; sent_at: string; delivered_at?: string; failed_at?: string; submission_id?: string };
    const emailsBySubData = (emailsBySubRes.data as EmailRow[]) || [];
    const emailsByClientData = (emailsByClientRes.data as EmailRow[]) || [];
    const seenEmailIds = new Set(emailsBySubData.map((e) => e.id));
    const allEmails = [...emailsBySubData, ...emailsByClientData.filter((e) => !seenEmailIds.has(e.id))];
    allEmails.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

    const smsBySubData = (smsBySubRes.data as SmsRow[]) || [];
    const smsByClientData = (smsByClientRes.data as SmsRow[]) || [];
    const seenSmsIds = new Set(smsBySubData.map((s) => s.id));
    const allSms = [...smsBySubData, ...smsByClientData.filter((s) => !seenSmsIds.has(s.id))];
    allSms.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

    const servicesMap = new Map(
      ((servicesCatalogRes.data as { service_id: string; name: string; base_price: number }[]) || []).map((s) => [s.service_id, s])
    );
    const optionsMap = new Map(
      ((optionsCatalogRes.data as { option_id: string; name: string; additional_price: number }[]) || []).map((o) => [o.option_id, o])
    );

    const orderItems: { id: string; type: string; name: string; ref: string; price: number; quantity: number; serviceId?: string }[] = [];
    const selectedServices = subData?.selected_services || subData?.selectedServices || [];
    const serviceDocuments = subData?.serviceDocuments || subData?.documents || {};

    if (selectedServices.length > 0 && Object.keys(serviceDocuments).length > 0) {
      let itemIdx = 0;
      for (const serviceId of selectedServices) {
        const service = servicesMap.get(serviceId);
        const docs = serviceDocuments[serviceId] || [];
        if (service && docs.length > 0) {
          orderItems.push({
            id: `svc-${serviceId}-${itemIdx}`,
            type: "service",
            name: service.name,
            ref: serviceId?.toUpperCase() || "",
            price: Number(service.base_price) || 0,
            quantity: docs.length,
            serviceId,
          });
          itemIdx++;
          for (const doc of docs) {
            const opts = Array.isArray(doc.selectedOptions) ? doc.selectedOptions : doc.selectedOptions ? [doc.selectedOptions] : [];
            for (const optId of opts) {
              const opt = optionsMap.get(optId);
              if (opt) {
                orderItems.push({
                  id: `opt-${optId}-${itemIdx}-${doc.name || ""}`,
                  type: "option",
                  name: opt.name,
                  ref: optId?.toUpperCase() || "",
                  price: Number(opt.additional_price) || 0,
                  quantity: 1,
                });
              }
            }
          }
        }
      }
    }

    if (orderItems.length === 0) {
      type ServiceRow = { name: string; base_price: number; service_id: string };
      type OptionRow = { name: string; additional_price: number; option_id: string };
      const servicesData = (servicesJunctionRes.data as unknown as { id: string; services: ServiceRow | ServiceRow[] | null }[]) || [];
      const optionsData = (optionsJunctionRes.data as unknown as { id: string; options: OptionRow | OptionRow[] | null }[]) || [];
      for (const ss of servicesData) {
        const svc = Array.isArray(ss.services) ? ss.services[0] : ss.services;
        if (svc) {
          const sid = svc.service_id;
          orderItems.push({
            id: ss.id,
            type: "service",
            name: svc.name,
            ref: sid?.toUpperCase() || "",
            price: Number(svc.base_price) || 0,
            quantity: 1,
            serviceId: sid,
          });
        }
      }
      for (const so of optionsData) {
        const opt = Array.isArray(so.options) ? so.options[0] : so.options;
        if (opt) {
          orderItems.push({
            id: so.id,
            type: "option",
            name: opt.name,
            ref: opt.option_id?.toUpperCase() || "",
            price: Number(opt.additional_price) || 0,
            quantity: 1,
          });
        }
      }
    }

    const filesFromDb = (filesRes.data as { id: string; file_name: string; file_url: string; storage_path?: string }[]) || [];

    const BUCKETS = ["form-documents", "submission-documents", "notary-documents"];
    const getSignedUrl = async (storagePath: string): Promise<string | null> => {
      for (const bucket of BUCKETS) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 3600);
          if (!error && data?.signedUrl) return data.signedUrl;
        } catch {
          /* try next bucket */
        }
      }
      return null;
    };

    const docsByName = new Map<string, { file_url: string; storage_path?: string }>();
    for (const f of filesFromDb) {
      const n = (f.file_name || "").toLowerCase().trim();
      if (n) docsByName.set(n, { file_url: f.file_url, storage_path: f.storage_path });
    }

    const documentsByService: Record<string, { name: string; file_url: string }[]> = {};
    const docsFromData: { id: string; file_name: string; file_url: string }[] = [];

    for (const serviceId of Object.keys(serviceDocuments)) {
      const docs = serviceDocuments[serviceId] || [];
      documentsByService[serviceId] = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const name = d.name || `Document ${i + 1}`;
        let url = d.url || d.public_url || d.file_url;
        const matched = docsByName.get((d.name || "").toLowerCase().trim());
        if (!url && matched) url = matched.file_url;
        const storagePath = d.path || d.storage_path || matched?.storage_path;
        if (storagePath) {
          const signed = await getSignedUrl(storagePath);
          if (signed) url = signed;
        }
        if (url) {
          documentsByService[serviceId].push({ name, file_url: url });
          if (!filesFromDb.some((f) => f.file_name === name)) {
            docsFromData.push({ id: `data-${serviceId}-${i}`, file_name: name, file_url: url });
          }
        }
      }
    }

    const allFiles: { id: string; file_name: string; file_url: string }[] = [];
    for (const f of filesFromDb) {
      let url = f.file_url;
      if (f.storage_path) {
        const signed = await getSignedUrl(f.storage_path);
        if (signed) url = signed;
      }
      allFiles.push({ id: f.id, file_name: f.file_name, file_url: url });
    }
    for (const d of docsFromData) {
      if (!allFiles.some((f) => f.file_name === d.file_name)) {
        allFiles.push(d);
      }
    }
    const files = allFiles;

    if (Object.keys(documentsByService).length === 0 && allFiles.length > 0 && selectedServices.length > 0) {
      const firstServiceId = selectedServices[0];
      documentsByService[firstServiceId] = allFiles.map((f) => ({ name: f.file_name, file_url: f.file_url }));
    }

    const dbSignatories = (signatoriesRes.data as { id: string; document_key: string; first_name: string; last_name: string; birth_date?: string; birth_city?: string; postal_address?: string; email?: string; phone?: string }[]) || [];
    const dataSignatories = (parsedData as { signatories?: { firstName?: string; lastName?: string; email?: string; phone?: string; birthDate?: string; birthCity?: string; postalAddress?: string }[] })?.signatories || [];
    const signatories = dbSignatories.length > 0
      ? dbSignatories.map((s) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email || null,
          phone: s.phone || null,
          birth_date: s.birth_date || null,
          birth_city: s.birth_city || null,
          postal_address: s.postal_address || null,
          document_key: s.document_key,
        }))
      : dataSignatories.map((s, i) => ({
          id: `data-${i}`,
          first_name: s.firstName || "",
          last_name: s.lastName || "",
          email: s.email || null,
          phone: s.phone || null,
          birth_date: s.birthDate || null,
          birth_city: s.birthCity || null,
          postal_address: s.postalAddress || null,
          document_key: "",
        }));

    const emails = allEmails;
    const sms = allSms;

    // Créer automatiquement des tâches pour chaque option dans la commande
    const optionItems = orderItems.filter((i) => i.type === "option");
    if (optionItems.length > 0) {
      const { data: existingTasks } = await supabase
        .from("submission_tasks")
        .select("order_item_ref")
        .eq("submission_id", id);
      const existingRefs = new Set((existingTasks || []).map((t) => t.order_item_ref));

      for (const item of optionItems) {
        if (!existingRefs.has(item.id)) {
          const m = item.id.match(/^opt-[^-]+-\d+-(.+)$/);
          await supabase.from("submission_tasks").insert({
            submission_id: id,
            order_item_ref: item.id,
            option_id: item.ref,
            option_name: item.name,
            document_context: m ? m[1] : null,
            status: "pending",
          });
          existingRefs.add(item.id);
        }
      }
    }

    const { data: tasksData } = await supabase
      .from("submission_tasks")
      .select("id, order_item_ref, option_id, option_name, document_context, status, notes, created_at, updated_at")
      .eq("submission_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      submission: sub,
      items: orderItems,
      tasks: tasksData || [],
      client: clientRes.data,
      timeline: timelineRes.data || [],
      notes: notesRes.data || [],
      files,
      documentsByService,
      signatories,
      emails,
      sms,
    });
  } catch (err) {
    console.error("[API admin submissions]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body as { status?: string };

    const allowedStatuses = ["confirmed", "completed", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide. Valeurs autorisées : confirmed, completed, cancelled" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: { status: string; updated_at: string; completed_at?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("submission")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API admin submissions PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (err) {
    console.error("[API admin submissions PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
