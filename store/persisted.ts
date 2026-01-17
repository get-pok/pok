import { mmkvStorage } from '@/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Connection {
    id: string
    url: string
    email: string
    password: string
    apiToken?: string
    apiTokenExpiry?: number
}

interface PersistedStoreState {
    connections: Connection[]
    currentConnection: Connection | null
    switchConnection: (props: {
        connectionId: string
    }) => void
    removeConnection: (connectionId: string) => void
    addConnection: (connection: Connection) => void

    countToReviewPrompt: number
    setCountToReviewPrompt: (count: number) => void
    lastShownReviewPrompt: number | null
    setLastShownReviewPrompt: (ts: number) => void

    primaryColumns: Record<string, string | undefined>
    setPrimaryColumn: (collectionId: string, column: string) => void

    acknowledgments: {
        swipeLeft: boolean
    }
    acknowledge: (type: keyof PersistedStoreState['acknowledgments']) => void

    hasSeenOnboarding: boolean

    installationTs: number
}

export const usePersistedStore = create<PersistedStoreState>()(
    persist(
        (set, get) => ({
            connections: [],
            currentConnection: null,
            removeConnection: (connectionId: string) => {
                const newConnections = get().connections.filter((c) => c.id !== connectionId)

                set({
                    connections: newConnections,
                    currentConnection: newConnections[0] || null,
                })
            },
            addConnection: (connection: Connection) => {
                set((state) => ({
                    connections: [...state.connections, connection],
                }))
            },
            switchConnection: (props: {
                connectionId: string
            }) => {
                const state = get()

                const connection = state.connections.find((c) => c.id === props.connectionId)
                if (!connection) return

                const newConnections = state.connections.map((c) =>
                    c.id === connection.id ? connection : c
                )

                set({
                    connections: newConnections,
                    currentConnection: connection,
                })

                // queryClient.invalidateQueries()
            },

            countToReviewPrompt: 12,
            setCountToReviewPrompt: (count: number) => {
                set({ countToReviewPrompt: count })
            },
            lastShownReviewPrompt: null,
            setLastShownReviewPrompt: (ts: number) => {
                set({ lastShownReviewPrompt: ts })
            },

            primaryColumns: {},
            setPrimaryColumn: (collectionId: string, column: string) => {
                set({ primaryColumns: { ...get().primaryColumns, [collectionId]: column } })
            },

            acknowledgments: {
                swipeLeft: false,
            },
            acknowledge: (type: keyof PersistedStoreState['acknowledgments']) => {
                set({ acknowledgments: { ...get().acknowledgments, [type]: true } })
            },

            hasSeenOnboarding: false,

            installationTs: Date.now(),
        }),
        {
            name: 'pok-persisted-store',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
        }
    )
)
