import { createClient } from '@/lib/supabase/client'

export class NotificationService {
  private static instance: NotificationService
  private supabase = createClient()
  private subscribers: Map<string, (data: any) => void> = new Map()

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Subscribe to real-time task updates for a specific driver
  subscribeToTaskUpdates(driverId: string, callback: (data: any) => void) {
    const channel = this.supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_driver_id=eq.${driverId}`,
        },
        callback
      )
      .subscribe()

    this.subscribers.set(`tasks-${driverId}`, callback)
    return channel
  }

  // Subscribe to real-time file updates for a specific task
  subscribeToFileUpdates(taskId: string, callback: (data: any) => void) {
    const channel = this.supabase
      .channel('file-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_files',
          filter: `task_id=eq.${taskId}`,
        },
        callback
      )
      .subscribe()

    this.subscribers.set(`files-${taskId}`, callback)
    return channel
  }

  // Subscribe to all task updates (for operations panel)
  subscribeToAllTaskUpdates(callback: (data: any) => void) {
    const channel = this.supabase
      .channel('all-task-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        callback
      )
      .subscribe()

    this.subscribers.set('all-tasks', callback)
    return channel
  }

  // Subscribe to driver location updates
  subscribeToDriverLocations(callback: (data: any) => void) {
    const channel = this.supabase
      .channel('driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
        },
        callback
      )
      .subscribe()

    this.subscribers.set('driver-locations', callback)
    return channel
  }

  // Update driver location (Insert new record)
async updateDriverLocation(driverId: string, location: {
  latitude: number
  longitude: number
  accuracy?: number
  heading?: number
  speed?: number
}) {
  try {
    // Önce şoförün mevcut konum kaydını kontrol et
    const { data: existingLocation, error: selectError } = await this.supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116: Kayıt bulunamadı hatası, bu durumda yeni kayıt oluşturacağız
      console.error('Supabase select error details:', {
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
        code: selectError.code
      });
      throw new Error(`Database select error: ${selectError.message}`);
    }

    const locationData = {
      driver_id: driverId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      timestamp: new Date().toISOString(),
    };

    if (existingLocation) {
      // Mevcut kayıt varsa güncelle
      const { error: updateError } = await this.supabase
        .from('driver_locations')
        .update(locationData)
        .eq('driver_id', driverId);

      if (updateError) {
        console.error('Supabase update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw new Error(`Database update error: ${updateError.message}`);
      }

      console.log(`Successfully updated location for driver ${driverId}`);
    } else {
      // Mevcut kayıt yoksa yeni kayıt oluştur
      const { error: insertError } = await this.supabase
        .from('driver_locations')
        .insert(locationData);

      if (insertError) {
        console.error('Supabase insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw new Error(`Database insert error: ${insertError.message}`);
      }

      console.log(`Successfully inserted new location for driver ${driverId}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Error updating driver location:', errorMessage);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

  // Unsubscribe from updates
  unsubscribe(key: string) {
    this.subscribers.delete(key)
  }

  // Clean up all subscriptions
  cleanup() {
    this.subscribers.clear()
    this.supabase.removeAllChannels()
  }
}

export const notificationService = NotificationService.getInstance()