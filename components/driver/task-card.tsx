"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Phone, Clock } from "lucide-react"

interface TaskCardProps {
  task: any
  onClick: () => void
  getStatusColor: (status: string) => string
}

export default function TaskCard({ task, onClick, getStatusColor }: TaskCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "Saat Belirsiz"
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
            <Badge className={`${getStatusColor(task.status)} text-xs`}>
              {task.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(task.pickup_date)}</span>
            </div>
            {task.pickup_time && (
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(task.pickup_time)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Alış</p>
              <p className="text-sm text-gray-600">{task.pickup_location}</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Bırakış</p>
              <p className="text-sm text-gray-600">{task.dropoff_location}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
            <Phone className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{task.customer_name}</p>
              <p className="text-sm text-gray-600">{task.customer_phone}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
