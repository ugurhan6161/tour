// components/NotificationComponent.jsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NotificationComponent = () => {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // Sadece tarayıcı ortamında çalıştır
    if (typeof window === 'undefined') return;

    // Firebase'i dinamik olarak import et
    const initializeNotifications = async () => {
      try {
        const { getFCMToken, onMessageListener } = await import('@/lib/firebase');
        
        const token = await getFCMToken();
        if (token) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ fcm_token: token })
              .eq('id', user.id);
          }
        }

        onMessageListener().then(payload => {
          console.log('Bildirim alındı:', payload);
          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/logo.png'
            });
          }
        });
      } catch (error) {
        console.error('Bildirim başlatılamadı:', error);
      }
    };

    initializeNotifications();
  }, []);

  return null;
};

export default NotificationComponent;
