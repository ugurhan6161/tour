// components/NotificationComponent.jsx güncellemesi
'use client';

import { useEffect, useState } from 'react';
import { getFCMToken, onMessageListener } from '@/lib/firebase';
import { createClient } from '@/lib/supabase/client';

const NotificationComponent = () => {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // Kullanıcı oturum durumunu kontrol et
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Sadece oturum açmış kullanıcılar için bildirimleri etkinleştir
    if (user) {
      const requestNotificationPermission = async () => {
        try {
          const token = await getFCMToken();
          if (token) {
            // Token'ı Supabase'e kaydet
            await supabase
              .from('profiles')
              .update({ fcm_token: token })
              .eq('id', user.id);
          }
        } catch (error) {
          console.error('Bildirim izni alınamadı:', error);
        }
      };

      requestNotificationPermission();

      // Ön planda gelen bildirimleri dinle
      onMessageListener().then(payload => {
        console.log('Bildirim alındı:', payload);
        // Bildirimi göster
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/logo.png'
          });
        }
      });
    }
  }, [user]); // user değiştiğinde bu effect tekrar çalışacak

  return null;
};

export default NotificationComponent;