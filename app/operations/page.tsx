import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import OperationsDashboard from "@/components/operations/operations-dashboard"

export default async function OperationsPage() {
  const profile = await requireRole(["operations", "admin"])
  const supabase = await createClient()

  // Get all tasks with driver information
  const { data: tasks } = await supabase.from("driver_tasks_view").select("*").order("pickup_date", { ascending: true })

  const { data: drivers } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      drivers!drivers_user_id_fkey (
        user_id,
        vehicle_plate,
        license_number,
        is_active
      )
    `)
    .eq("role", "driver")

  return <OperationsDashboard profile={profile} initialTasks={tasks || []} drivers={drivers || []} />
}
