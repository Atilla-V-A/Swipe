import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSettingsStore = create(
  persist(
    (set) => ({
      darkMode: false,
      language: 'English',
      notificationsEnabled: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setLanguage: (lang) => set({ language: lang }),
      toggleNotifications: (enabled) => set({ notificationsEnabled: enabled }),
      resetSettings: () => set({ darkMode: false, language: 'English', notificationsEnabled: false }),
    }),
    {
      name: 'settings-storage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => AsyncStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
