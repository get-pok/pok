import { create } from 'zustand'

interface StoreState {
    number: number
    increment: () => void
    decrement: () => void
}

export const useStore = create<StoreState>()((set, get) => ({
    number: 0,
    increment: () => {
        set((state) => ({ number: state.number + 1 }))
    },
    decrement: () => {
        set((state) => ({ number: state.number - 1 }))
    },
}))
