import { useStore } from '@/store/default'
import { usePersistedStore } from '@/store/persisted'
import { router } from 'expo-router'
import PocketBase from 'pocketbase'
import { Alert } from 'react-native'

export default async function getClient(connectionId?: string) {
    const existingClient = useStore.getState().pbClient
    if (existingClient?.authStore.isValid) {
        console.log('Using existing client')
        return existingClient
    }

    const currentConnection = connectionId
        ? usePersistedStore.getState().connections.find((c) => c.id === connectionId)
        : usePersistedStore.getState().currentConnection

    if (!currentConnection) {
        throw new Error('Current connection not found')
    }

    const client = new PocketBase(currentConnection.url)

    try {
        await client
            .collection('_superusers')
            .authWithPassword(currentConnection.email, currentConnection.password)
            .catch(async () => {
                await client
                    .collection('_superusers')
                    .authWithPassword(currentConnection.email, currentConnection.password)
            })
    } catch (error) {
        console.error('Error authenticating with Pocketbase', error)
        const connections = usePersistedStore.getState().connections
        usePersistedStore.setState({
            connections: connections.filter((c) => c.id !== currentConnection.id),
            currentConnection: connections.filter((c) => c.id !== currentConnection.id)[0],
        })
        router.dismissTo('/')
        Alert.alert('Error', 'Your Pocketbase credentials are invalid, please login again.')
    }

    useStore.setState({ pbClient: client })

    return client
}
