// components/TasksPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Search, Filter } from "lucide-react";
import TaskCard from "./task-card";
import { useState } from "react";

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
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  // Tarihe göre filtreleme
  const filterTasksByDate = (task: Task) => {
    if (dateFilter === "all") return true;
    
    const taskDate = new Date(task.pickup_date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    switch (dateFilter) {
      case "today":
        return taskDate.toDateString() === today.toDateString();
      case "tomorrow":
        return taskDate.toDateString() === tomorrow.toDateString();
      case "week":
        return taskDate >= today && taskDate <= nextWeek;
      case "past":
        return taskDate < today;
      default:
        return true;
    }
  };

  const filteredTasks = tasks
    .filter((task) => {
      const matchesFilter = activeFilter === "all" || task.status === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.dropoff_location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = filterTasksByDate(task);
      
      return matchesFilter && matchesSearch && matchesDate;
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

  // Görevleri tarihe göre gruplandır
  const groupTasksByDate = () => {
    const grouped: { [key: string]: Task[] } = {};
    
    filteredTasks.forEach(task => {
      const taskDate = new Date(task.pickup_date);
      let dateKey;
      
      // Tarih formatını belirle
      if (dateFilter === "all") {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (taskDate.toDateString() === today.toDateString()) {
          dateKey = "Bugün";
        } else if (taskDate.toDateString() === tomorrow.toDateString()) {
          dateKey = "Yarın";
        } else if (taskDate < today) {
          dateKey = "Geçmiş Tarihler";
        } else {
          dateKey = taskDate.toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      } else {
        dateKey = taskDate.toLocaleDateString('tr-TR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(task);
    });
    
    return grouped;
  };

  const groupedTasks = groupTasksByDate();

  // Filtre etiketleri
  const dateFilterLabels = {
    all: "Tüm Tarihler",
    today: "Bugün",
    tomorrow: "Yarın",
    week: "Bu Hafta",
    past: "Geçmiş"
  };

  const statusFilterLabels = {
    all: "Tüm Durumlar",
    new: "Yeni",
    assigned: "Bekleyen",
    in_progress: "Aktif",
    completed: "Tamamlanan",
    cancelled: "İptal Edilen"
  };

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">

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
          
          {/* Filtre Butonları */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setIsDateFilterOpen(true)}
              variant="outline" 
              size="sm"
              className="flex items-center justify-start gap-2 h-9"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate text-xs sm:text-sm">{dateFilterLabels[dateFilter]}</span>
            </Button>
            
            <Button 
              onClick={() => setIsStatusFilterOpen(true)}
              variant="outline" 
              size="sm"
              className="flex items-center justify-start gap-2 h-9"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate text-xs sm:text-sm">{statusFilterLabels[activeFilter]}</span>
            </Button>
          </div>
          
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
              <div className="space-y-4">
                {Object.entries(groupedTasks).map(([date, tasks]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-900 p-2 rounded-lg sticky top-0 z-10 bg-white">
                      {date} ({tasks.length} görev)
                    </h3>
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Tarih Filtresi Modal */}
      <Dialog open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center text-base">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Tarih Filtresi
            </DialogTitle>
          </DialogHeader>
          <Tabs value={dateFilter} onValueChange={setDateFilter} className="w-full">
            <TabsList className="grid grid-cols-1 gap-2 w-full">
              <TabsTrigger
                value="all"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsDateFilterOpen(false)}
              >
                Tüm Tarihler
              </TabsTrigger>
              <TabsTrigger
                value="today"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsDateFilterOpen(false)}
              >
                Bugün
              </TabsTrigger>
              <TabsTrigger
                value="tomorrow"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsDateFilterOpen(false)}
              >
                Yarın
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsDateFilterOpen(false)}
              >
                Bu Hafta
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsDateFilterOpen(false)}
              >
                Geçmiş Tarihler
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Durum Filtresi Modal */}
      <Dialog open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center text-base">
              <Filter className="h-5 w-5 mr-2 text-blue-600" />
              Durum Filtresi
            </DialogTitle>
          </DialogHeader>
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
            <TabsList className="grid grid-cols-1 gap-2 w-full">
              <TabsTrigger
                value="all"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                🔍 Tüm Durumlar
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                🆕 Yeni Görevler
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                ⏳ Bekleyen Görevler
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                🚌 Aktif Görevler
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                ✅ Tamamlanan Görevler
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="justify-start py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                onClick={() => setIsStatusFilterOpen(false)}
              >
                ❌ İptal Edilen Görevler
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
