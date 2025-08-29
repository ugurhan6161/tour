// types.ts
export interface Task {
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

export interface Location {
  id: string;
  name: string;
  notes: string;
  latitude: number;
  longitude: number;
  created_by: string;
  created_at: string;
}

export interface TourRoute {
  id: string;
  name: string;
  category: string;
  description: string;
  created_by: string;
  created_at: string;
  places: RoutePlace[];
}

export interface RoutePlace {
  id: string;
  route_id: string;
  place_name: string;
  order_index: number;
}

export interface DriverDashboardProps {
  profile: any;
  driver: any;
  initialTasks: Task[];
}
