import EmptyListComponent from '@/components/EmptyListComponent'
import getClient from '@/lib/pb'
import { invalidateCurrentConnection, queryClient } from '@/lib/query'
import { storage } from '@/lib/storage'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import Superwall from '@superwall/react-native-superwall'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router, useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Alert, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const log = (...args: any[]) => {
    console.log('[CollectionsScreen] ', ...args)
}

export default function CollectionsScreen() {
    const navigation = useNavigation()
    const [searchString, setSearchString] = useState('')
    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const connections = usePersistedStore((state) => state.connections)
    const removeConnection = usePersistedStore((state) => state.removeConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const collectionsQuery = useQuery({
        queryKey: ['collections', 'list'],
        queryFn: async () => {
            const pb = await getClient()
            return pb.collections.getFullList()
        },
    })

    const filteredCollections = useMemo(
        () =>
            collectionsQuery.data
                ?.filter((collection) =>
                    collection.name.toLowerCase().includes(searchString.toLowerCase())
                )
                .sort((a, b) => {
                    // Define priority order: normal auth (0), normal base (1), normal view (2), system auth (3), system other (4)
                    const getPriority = (collection: any) => {
                        if (!collection.system) {
                            if (collection.type === 'auth') return 0
                            if (collection.type === 'base') return 1
                            if (collection.type === 'view') return 2
                        }

                        if (collection.type === 'auth') return 3
                        return 4 // system collections of other types
                    }

                    const aPriority = getPriority(a)
                    const bPriority = getPriority(b)

                    // If priorities are different, sort by priority
                    if (aPriority !== bPriority) {
                        return aPriority - bPriority
                    }

                    // If priorities are the same, sort alphabetically
                    return a.name.localeCompare(b.name)
                }) || [],
        [collectionsQuery.data, searchString]
    )

    const emptyListComponent = useMemo(() => {
        const emptyCollections = EmptyListComponent({
            isLoading: collectionsQuery.isLoading,
            hasValue: filteredCollections.length > 0,
            emptyLabel: 'No collections found',
            error: collectionsQuery.error,
            errorLabel: 'Failed to fetch collections',
        })

        return emptyCollections
    }, [collectionsQuery.isLoading, collectionsQuery.error, filteredCollections.length])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        ...connections.map((connection) => ({
                            title: connection.email,
                            inlineChildren: true,
                            disabled: connection.id === currentConnection?.id,
                            actions: [
                                {
                                    title: connection.url,
                                    destructive: false,
                                    disabled: connection.id === currentConnection?.id,
                                },
                                {
                                    title: 'Remove Connection',
                                    systemIcon: 'trash',
                                    destructive: true,
                                },
                            ],
                        })),
                        {
                            title: 'Add Connection',
                            systemIcon: 'plus',
                            destructive: false,
                        },
                    ]}
                    onPress={async (e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                        if (e.nativeEvent.name === 'Remove Connection') {
                            const [connectionPath] = e.nativeEvent.indexPath // [connectionPath, actionPath]

                            Alert.alert(
                                'Remove Connection',
                                'Are you sure you want to remove this connection?',
                                [
                                    {
                                        text: 'Remove',
                                        onPress: async () => {
                                            // we can  use the same index because they get displayed in the same order
                                            const connectionId = connections[connectionPath].id
                                            if (!connectionId) return

                                            await invalidateCurrentConnection()

                                            removeConnection(connectionId)

                                            // if we had 1 connection before, we will have none
                                            if (connections.length === 1) {
                                                storage.clearAll()
                                                router.dismissAll()
                                                router.replace('/login')
                                                queryClient.clear()
                                                return
                                            }
                                        },
                                        style: 'destructive',
                                    },
                                    {
                                        text: 'Cancel',
                                        style: 'cancel',
                                    },
                                ]
                            )

                            return
                        }

                        if (e.nativeEvent.name === 'Add Connection') {
                            if (__DEV__) {
                                router.push('/login')
                                return
                            }

                            Superwall.shared
                                .register({
                                    placement: 'AddConnection',
                                    feature: () => {
                                        router.push('/login')
                                    },
                                })
                                .catch((error) => {
                                    console.error('Error registering AddConnection', error)
                                    Alert.alert('Error', 'Something went wrong, please try again.')
                                })
                            return
                        }

                        const [connectionPath] = e.nativeEvent.indexPath
                        const selectedConnection = connections[connectionPath]

                        if (!selectedConnection) return
                        if (!currentConnection) return // pleasing the compiler

                        if (selectedConnection.id !== currentConnection.id) {
                            await invalidateCurrentConnection()
                            switchConnection({
                                connectionId: selectedConnection.id,
                            })
                            return
                        }
                    }}
                >
                    <TouchableOpacity
                        style={{
                            height: 32,
                            width: 32,
                            borderRadius: 16,
                            overflow: 'hidden',
                            marginRight: 10,
                        }}
                    >
                        <Image
                            source={require('@/assets/icon.png')}
                            style={{ flex: 1, width: 32 }}
                        />
                    </TouchableOpacity>
                </ContextMenu>
            ),
            headerSearchBarOptions: {
                placeholder: 'Search',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                placeholderTextColor: COLORS.textMuted, // android
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
            },
        })
    }, [navigation, connections, currentConnection, removeConnection, switchConnection])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    tintColor={COLORS.info}
                    refreshing={collectionsQuery.isRefetching}
                    onRefresh={collectionsQuery.refetch}
                    // android
                    progressBackgroundColor={COLORS.bgLevel1}
                    colors={[COLORS.info]}
                />
            }
            showsVerticalScrollIndicator={false}
            data={filteredCollections}
            overrideProps={
                emptyListComponent && {
                    contentContainerStyle: {
                        flex: 1,
                    },
                }
            }
            ListEmptyComponent={emptyListComponent}
            renderItem={({ item: collection, index: collectionIndex }) => (
                <TouchableOpacity
                    style={{
                        backgroundColor: collectionIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                        padding: 16,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                    onPress={() => {
                        router.push(`/collection/${collection.id}`)
                    }}
                >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                            name={
                                collection.system
                                    ? 'cog'
                                    : collection.type === 'auth'
                                      ? 'people-outline'
                                      : collection.type === 'view'
                                        ? 'grid-outline'
                                        : 'folder-outline'
                            }
                            color={COLORS.text}
                            size={24}
                        />
                        <Text
                            style={{
                                fontSize: 16,
                                color: COLORS.text,
                                fontWeight: 600,
                            }}
                        >
                            {collection.name}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Ionicons name="chevron-forward" color={COLORS.textMuted} size={24} />
                    </View>
                </TouchableOpacity>
            )}
        />
    )
}
