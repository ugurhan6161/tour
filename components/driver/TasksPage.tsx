// components/TasksPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Search } from "lucide-react";
import TaskCard from "./task-card";

interface Task {
  id: string;
  title: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  customer_name: string;
  customer_phone: string;
  customer_notes: string;
  status: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  created_at: string;
}

interface TasksPageProps {
  tasks: Task[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getStatusColor: (status: string) => string;
  onTaskClick: (task: Task) => void;
}

export default function TasksPage({
  tasks,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  getStatusColor,
  onTaskClick
}: TasksPageProps) {
  const filteredTasks = tasks
    .filter((task) => {
      const matchesFilter = activeFilter === "all" || task.status === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (activeFilter === "all") {
        const statusOrder = {
          assigned: 1,
          in_progress: 2,
          completed: 3,
          new: 4,
          cancelled: 5,
        };
        return statusOrder[a.status] - statusOrder[b.status] || new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
      }
      return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
    });

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
      <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-base font-bold text-gray-800">
            Görevler ({filteredTasks.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Müşteri adı, konum ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-lg border-2 border-gray-200 focus:border-blue-400 bg-white/50"
            />
          </div>
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-gray-100/50 rounded-lg p-1">
              <TabsTrigger
                value="all"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md"
              >
                🔍 Tümü
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                🆕 Yeni
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                ⏳ Bekleyen
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                🚌 Aktif
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                ✅ Biten
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="rounded-md text-xs font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                ❌ İptal
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <div className="p-3 bg-gray-100 rounded-full inline-block mb-3">
                    <Calendar className="h-8 w-8 mx-auto" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {activeFilter === "all" ? "🔍 Görev Bulunamadı" : "📋 Filtreli Görev Yok"}
                </h3>
                <p className="text-gray-600 text-sm max-w-md mx-auto">
                  {activeFilter === "all"
                    ? "Henüz size atanmış bir görev bulunmuyor. Yeni görevler için bekleyin."
                    : `${
                        activeFilter === "new"
                          ? "🆕 Yeni"
                          : activeFilter === "assigned"
                          ? "⏳ Bekleyen"
                          : activeFilter === "in_progress"
                          ? "🚌 Aktif"
                          : activeFilter === "completed"
                          ? "✅ Tamamlanan"
                          : "❌ İptal edilen"
                      } görev bulunamadı.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
