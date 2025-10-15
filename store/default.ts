import type PocketBase from 'pocketbase'
import { create } from 'zustand'

interface StoreState {
    pbClient: PocketBase | null
}

export const useStore = create<StoreState>()((set, get) => ({
    pbClient: null,
}))
