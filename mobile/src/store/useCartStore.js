import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cartItems: [], 
  
  setCartItems: (items) => set({ cartItems: items }),

  addToCart: (product) => set((state) => {
    const isAlreadyInCart = state.cartItems.some(item => {
      const itemId = item.product ? item.product._id : item._id;
      return itemId === product._id;
    });
    if (isAlreadyInCart) return state;
    
    return { cartItems: [...state.cartItems, product] };
  }),

  // BURASI GÜNCELLENDİ: Silme işlemi artık hem eski (sarmallı) hem de yeni (düz) ürünleri tanıyor
  removeFromCart: (productId) => set((state) => ({
    cartItems: state.cartItems.filter(item => {
      const itemId = item.product ? item.product._id : item._id;
      return itemId !== productId;
    })
  })),

  clearCart: () => set({ cartItems: [] })
}));