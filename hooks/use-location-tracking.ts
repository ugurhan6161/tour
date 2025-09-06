import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/lib/notification-service'

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  heading?: number
  speed?: number
  timestamp: Date
}

interface UseLocationTrackingOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  interval?: number // Update interval in milliseconds
}

export function useLocationTracking(
  driverId: string | null,
  isTracking: boolean = false,
  options: UseLocationTrackingOptions = {}
) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [isDevelopmentMode] = useState(() => process.env.NODE_ENV === 'development')

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    interval = 30000, // Update every 30 seconds
  } = options

  // Check if geolocation is supported
  useEffect(() => {
    const supported = 'geolocation' in navigator && 'getCurrentPosition' in navigator.geolocation
    setIsSupported(supported)
    
    if (!supported) {
      if (isDevelopmentMode) {
        // In development mode, provide a mock location for testing
        setError('Geolocation not available - using development mode')
        setPermissionStatus('granted')
        setLocation({
          latitude: 41.0082, // Istanbul coordinates for testing
          longitude: 28.9784,
          accuracy: 10,
          timestamp: new Date()
        })
      } else {
        setError('Geolocation is not supported by this browser')
        setPermissionStatus('denied')
      }
    }
  }, [isDevelopmentMode])

  // Check permission status
  useEffect(() => {
    if (!isSupported) return

    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        setPermissionStatus(result.state)
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state)
        })
      } catch (error) {
        console.warn('Could not check geolocation permission:', error)
      }
    }

    checkPermission()
  }, [isSupported])

  // Get current position
  const getCurrentPosition = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: new Date()
          }
          resolve(locationData)
        },
        (error) => {
          let errorMessage = 'Unknown location error'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      )
    })
  }, [isSupported, enableHighAccuracy, timeout, maximumAge])

  // Update location and send to server
  const updateLocation = useCallback(async () => {
    if (!driverId || !isTracking) {
      return
    }

    // If geolocation is not supported but we're in development mode, use mock data
    if (!isSupported && isDevelopmentMode) {
      try {
        const mockLocation = {
          latitude: 41.0082 + (Math.random() - 0.5) * 0.01, // Slight random variation
          longitude: 28.9784 + (Math.random() - 0.5) * 0.01,
          accuracy: 10,
          heading: Math.random() * 360,
          speed: Math.random() * 50
        }

        setLocation({ ...mockLocation, timestamp: new Date() })
        setError('Development mode - using mock location')

        // Send mock location to server
        await notificationService.updateDriverLocation(driverId, mockLocation)
        return
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update mock location'
        setError(errorMessage)
        console.error('Mock location update failed:', errorMessage)
        return
      }
    }

    if (!isSupported) {
      setError('Geolocation is not supported')
      return
    }

    try {
      const locationData = await getCurrentPosition()
      setLocation(locationData)
      setError(null)

      // Send location to server
      await notificationService.updateDriverLocation(driverId, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        heading: locationData.heading,
        speed: locationData.speed
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location'
      setError(errorMessage)
      console.error('Location update failed:', errorMessage, error instanceof Error ? error.stack : error)
    }
  }, [driverId, isTracking, isSupported, isDevelopmentMode, getCurrentPosition])

  // Start/stop location tracking
  useEffect(() => {
    if (!isTracking || !driverId) return
    // Allow tracking in development mode even without real geolocation
    if (!isSupported && !isDevelopmentMode) return

    // Initial location update
    updateLocation()

    // Set up interval for regular updates
    const intervalId = setInterval(updateLocation, interval)

    return () => {
      clearInterval(intervalId)
    }
  }, [isTracking, driverId, isSupported, isDevelopmentMode, interval, updateLocation])

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Geolocation is not supported')
      return false
    }

    try {
      await getCurrentPosition()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission denied'
      setError(errorMessage)
      console.error('Permission request failed:', errorMessage)
      return false
    }
  }, [isSupported, getCurrentPosition])

  // Manual location update
  const refreshLocation = useCallback(async () => {
    await updateLocation()
  }, [updateLocation])

  return {
    location,
    error,
    isSupported,
    permissionStatus,
    requestPermission,
    refreshLocation,
    isTracking: isTracking && !!driverId
  }
}
