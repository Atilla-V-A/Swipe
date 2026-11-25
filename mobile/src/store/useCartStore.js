import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  cartItems: [],
  trashItems: [], // Çöp kutusu dizisi

  // 1. ESKİ TEMEL FONKSİYONLAR (Bunları yanlışlıkla silmiştik, geri ekledik)
  setCartItems: (items) => set({ cartItems: items }),

  addToCart: (item) => set((state) => {
    // Ürün zaten sepette varsa tekrar ekleme
    const productId = item.product ? item.product._id : item._id;
    const exists = state.cartItems.find(i => (i.product ? i.product._id : i._id) === productId);
    if (exists) return state;

    return { cartItems: [...state.cartItems, item] };
  }),

  // Eski tip direkt silme fonksiyonu (SwipeScreen vs kullanıyorsa diye durmalı)
  removeFromCart: (productId) => set((state) => ({
    cartItems: state.cartItems.filter(i => (i.product ? i.product._id : i._id) !== productId)
  })),

  clearCart: () => set({ cartItems: [] }),

  // 2. YENİ: ÇÖP KUTUSU (TRASH) FONKSİYONLARI
  moveToTrash: (item) => {
    const productId = item.product ? item.product._id : item._id;
    
    set((state) => {
      // Sepetten çıkar
      const newCart = state.cartItems.filter(i => (i.product ? i.product._id : i._id) !== productId);
      
      // Çöpe ekle
      let newTrash = [item, ...state.trashItems];
      
      // Maksimum 5 ürün kuralı
      if (newTrash.length > 5) {
        newTrash = newTrash.slice(0, 5);
      }
      
      return { cartItems: newCart, trashItems: newTrash };
    });

    // Otomatik Silme: 5 dakika (300.000 ms) sonra kalıcı sil
    setTimeout(() => {
      get().removeFromTrash(productId);
    }, 5 * 60 * 1000);
  },

  removeFromTrash: (productId) => set((state) => ({
    trashItems: state.trashItems.filter(i => (i.product ? i.product._id : i._id) !== productId)
  })),

  clearTrash: () => set({ trashItems: [] }),

  restoreFromTrash: (productId) => {
    set((state) => {
      const itemToRestore = state.trashItems.find(i => (i.product ? i.product._id : i._id) === productId);
      if (!itemToRestore) return state;

      return {
        trashItems: state.trashItems.filter(i => (i.product ? i.product._id : i._id) !== productId),
        cartItems: [...state.cartItems, itemToRestore]
      };
    });
  }
}));