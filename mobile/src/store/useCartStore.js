import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cartItems: [], // Sepetteki ürünlerin tutulacağı dizi
  
  // YENİ EKLENEN: Backend'den gelen hazır sepet listesini Zustand'a yükler
  setCartItems: (items) => set({ cartItems: items }),

  // Ürünü sepete ekleyen fonksiyon
  addToCart: (product) => set((state) => {
    // Eğer ürün zaten sepetteyse (aynı _id varsa) tekrar ekleme
    const isAlreadyInCart = state.cartItems.some(item => item._id === product._id);
    if (isAlreadyInCart) return state;
    
    return { cartItems: [...state.cartItems, product] };
  }),

  // İleride sepet ekranında kullanacağımız çıkarma fonksiyonu
  removeFromCart: (productId) => set((state) => ({
    cartItems: state.cartItems.filter(item => item._id !== productId)
  })),

  // Sepeti tamamen boşaltma
  clearCart: () => set({ cartItems: [] })
}));