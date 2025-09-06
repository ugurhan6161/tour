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

    // Kullanıcı oturum durumunu izle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // İlk oturum durumunu al
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    getSession();

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    // Sadece tarayıcı ortamında ve kullanıcı oturum açtığında çalıştır
    if (typeof window === 'undefined' || !user) return;

    const initializeNotifications = async () => {
      try {
        // Firebase'i dinamik olarak import et
        const { getFCMToken, onMessageListener } = await import('@/lib/firebase');
        
        // Token al
        const token = await getFCMToken();
        if (token) {
          // Token'ı Supabase'e kaydet
          await supabase
            .from('profiles')
            .update({ fcm_token: token })
            .eq('id', user.id);
        }

        // Bildirimleri dinle
        onMessageListener().then(payload => {
          console.log('Bildirim alındı:', payload);
          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/logo.png'
            });
          }
        }).catch(error => {
          console.error('Bildirim dinleme hatası:', error);
        });
      } catch (error) {
        console.error('Bildirim başlatılamadı:', error);
      }
    };

    initializeNotifications();
  }, [user]);

  return null;
};

export default NotificationComponent;
