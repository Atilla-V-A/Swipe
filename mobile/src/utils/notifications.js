import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Uygulama açıkken bildirim GÖSTERME
    shouldPlaySound: false, // Uygulama açıkken SES ÇIKARMA
    shouldSetBadge: false,
  }),
});

const notificationScripts = {
  English: [
    { title: "New Trends Alert! 👗", body: "Check out the latest fashion drops Drip." },
    { title: "Your Cart Misses You 🛒", body: "Don't forget to complete your checkout today!" },
    { title: "Ready for a new look? ✨", body: "Swipe right on your next favorite outfit." }
  ],
  Türkçe: [
    { title: "Yeni Trendler Geldi! 👗", body: "Drip'teki en yeni moda ürünlerine göz at." },
    { title: "Sepetin Seni Özledi 🛒", body: "Bugün alışverişini tamamlamayı unutma!" },
    { title: "Yeni bir tarza hazır mısın? ✨", body: "En seveceğin kıyafetleri keşfetmeye başla." }
  ]
};

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Hata', 'Bildirim izni reddedildi veya alınamadı! Status: ' + finalStatus);
    console.log('Failed to get push token for push notification!');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff4b4b',
    });
  }
  return true;
}

export async function scheduleDailyNotification(language) {
  // First cancel all previously scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Eksik İzin', 'Cihazda/Simülatörde bildirim izni henüz verilmemiş. Bu yüzden kurulum iptal edildi.');
    return; // Sadece izin varsa kur, sorma.
  }

  const scripts = notificationScripts[language] || notificationScripts['English'];
  // Pick a random script for variety
  const randomScript = scripts[Math.floor(Math.random() * scripts.length)];

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: randomScript.title,
        body: randomScript.body,
        sound: true,
      },
      trigger: {
        type: 'timeInterval',
        seconds: 60, // 24 saatte bir (veya minimum 60 olmalı)
        repeats: true,
      },
    });

    console.log(`Scheduled daily notification for language: ${language}`);
  } catch (err) {
    Alert.alert('Hata', 'Bildirim planlanırken hata oluştu: ' + err.message);
  }
}

export async function cancelNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Cancelled all notifications');
}
