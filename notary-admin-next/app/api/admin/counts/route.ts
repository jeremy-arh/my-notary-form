import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();

    const [tasksRes, supportRes] = await Promise.allSettled([
      supabase
        .from("submission_tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]),
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress", "waiting"]),
    ]);

    const tasksPending =
      tasksRes.status === "fulfilled" && !tasksRes.value.error && tasksRes.value.count != null
        ? tasksRes.value.count
        : 0;
    const supportPending =
      supportRes.status === "fulfilled" && !supportRes.value.error && supportRes.value.count != null
        ? supportRes.value.count
        : 0;

    return NextResponse.json({
      tasks_pending: typeof tasksPending === "number" ? tasksPending : 0,
      support_pending: typeof supportPending === "number" ? supportPending : 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur", tasks_pending: 0, support_pending: 0 },
      { status: 500 }
    );
  }
}
