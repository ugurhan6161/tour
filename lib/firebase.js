// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA37L2dW783BR8uIyDJnDQLlNWdJm88hCY",
  authDomain: "eycetur.firebaseapp.com",
  projectId: "eycetur",
  storageBucket: "eycetur.firebasestorage.app",
  messagingSenderId: "799383242025",
  appId: "1:799383242025:web:ed780b9f7075b48cc06338"
};

// Sadece tarayıcı ortamında Firebase'i başlat
let app;
let messaging;

export const getFCMToken = async () => {
  // Sunucu tarafında çalışıyorsa null döndür
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Firebase Messaging desteğini kontrol et
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.log('Firebase Messaging desteklenmiyor');
      return null;
    }

    // Firebase uygulamasını başlat
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    
    // Messaging'i başlat
    messaging = getMessaging(app);

    const vapidKey = 'BBl7TmlxA-2mcpLEqgysKI5lxbp_8o3blTjSDcWMqymkteOU6BCWom0Cf7BTbyfDjs6B9bLYGe2e94e7yMNZf8Q';
    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      return currentToken;
    } else {
      console.log('Token alınamadı');
      return null;
    }
  } catch (error) {
    console.error('Token alınırken hata oluştu:', error);
    return null;
  }
};

export const onMessageListener = () => {
  // Sunucu tarafında boş promise döndür
  if (typeof window === 'undefined') {
    return new Promise(() => {});
  }

  return new Promise(async (resolve) => {
    try {
      const messagingSupported = await isSupported();
      if (!messagingSupported) {
        console.log('Firebase Messaging desteklenmiyor');
        return;
      }

      if (!app) {
        app = initializeApp(firebaseConfig);
      }
      
      if (!messaging) {
        messaging = getMessaging(app);
      }
      
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    } catch (error) {
      console.error('Bildirim dinleyici başlatılamadı:', error);
    }
  });
};

// Messaging instance'ını dışa aktar
export { messaging };
