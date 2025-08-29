import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA37L2dW783BR8uIyDJnDQLlNWdJm88hCY",
  authDomain: "eycetur.firebaseapp.com",
  projectId: "eycetur",
  storageBucket: "eycetur.firebasestorage.app",
  messagingSenderId: "799383242025",
  appId: "1:799383242025:web:ed780b9f7075b48cc06338"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// FCM token almak için fonksiyon
export const getFCMToken = async () => {
  try {
    const currentToken = await getToken(messaging, { 
      vapidKey: "BBl7TmlxA-2mcpLEqgysKI5lxbp_8o3blTjSDcWMqymkteOU6BCWom0Cf7BTbyfDjs6B9bLYGe2e94e7yMNZf8Q" 
    });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
  }
};

// Ön planda gelen mesajları dinleme
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { messaging };