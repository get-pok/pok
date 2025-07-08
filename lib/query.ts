import { usePersistedStore } from '@/store/persisted'
import { QueryClient } from '@tanstack/react-query'
import ms from 'ms'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: ms('24h'),
            staleTime: ms('1m'),
            networkMode: 'offlineFirst',
            retry: 2, // default is 3
        },
    },
})

export async function invalidateCurrentConnection() {
    const currentConnection = usePersistedStore.getState().currentConnection
    if (currentConnection) {
        queryClient.removeQueries()
    }
}
