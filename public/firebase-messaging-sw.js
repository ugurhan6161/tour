importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA37L2dW783BR8uIyDJnDQLlNWdJm88hCY",
  authDomain: "eycetur.firebaseapp.com",
  projectId: "eycetur",
  storageBucket: "eycetur.firebasestorage.app",
  messagingSenderId: "799383242025",
  appId: "1:799383242025:web:ed780b9f7075b48cc06338",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Arka planda gelen mesajları işleme
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0zCbCWJQel7wZYoNmMnOJRuiTyNgfEQUwXw&s' // Uygulamanızın logosu
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
