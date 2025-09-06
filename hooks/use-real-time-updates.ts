import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/lib/notification-service'

interface UseRealTimeUpdatesOptions {
  enableNotifications?: boolean
  enableLocationTracking?: boolean
}

export function useRealTimeUpdates(
  driverId: string | null,
  options: UseRealTimeUpdatesOptions = {}
) {
  const [hasNewTasks, setHasNewTasks] = useState(false)
  const [hasTaskUpdates, setHasTaskUpdates] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const { enableNotifications = true, enableLocationTracking = true } = options

  // Handle task updates
  const handleTaskUpdate = useCallback((payload: any) => {
    console.log('Real-time task update:', payload)
    
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    setLastUpdateTime(new Date())
    
    if (eventType === 'INSERT') {
      setHasNewTasks(true)
    } else if (eventType === 'UPDATE') {
      setHasTaskUpdates(true)
    }
  }, [driverId, enableNotifications])

  // Setup real-time subscriptions
  useEffect(() => {
    if (!driverId) return

    console.log('Setting up real-time subscriptions for driver:', driverId)

    // Subscribe to task updates
    const taskChannel = notificationService.subscribeToTaskUpdates(driverId, handleTaskUpdate)
    
    taskChannel.on('system', {}, (status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions')
      taskChannel.unsubscribe()
      notificationService.unsubscribe(`tasks-${driverId}`)
    }
  }, [driverId, handleTaskUpdate, enableNotifications])

  // Clear notifications
  const clearNewTasksFlag = useCallback(() => {
    setHasNewTasks(false)
  }, [])

  const clearTaskUpdatesFlag = useCallback(() => {
    setHasTaskUpdates(false)
  }, [])

  // Manual refresh trigger
  const triggerRefresh = useCallback(() => {
    setLastUpdateTime(new Date())
  }, [])

  return {
    hasNewTasks,
    hasTaskUpdates,
    lastUpdateTime,
    isConnected,
    clearNewTasksFlag,
    clearTaskUpdatesFlag,
    triggerRefresh
  }
}
