import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useFlashlistProps } from '@/lib/hooks'
import getClient from '@/lib/pb'
import { invalidateCurrentConnection, queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { HeaderButton } from '@react-navigation/elements'
import * as Sentry from '@sentry/react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import * as QuickActions from 'expo-quick-actions'
import { router, useNavigation } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { usePlacement, useSuperwall, useUser } from 'expo-superwall'
import * as WebBrowser from 'expo-web-browser'
import ms from 'ms'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, Image, Platform, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const log = (...args: any[]) => {
    console.log('[CollectionsScreen] ', ...args)
}

export default function CollectionsScreen() {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()
    const { getPresentationResult } = useSuperwall()
    const navigation = useNavigation()
    const [searchString, setSearchString] = useState('')

    const countToReviewPrompt = usePersistedStore((state) => state.countToReviewPrompt)
    const setCountToReviewPrompt = usePersistedStore((state) => state.setCountToReviewPrompt)
    const lastShownReviewPrompt = usePersistedStore((state) => state.lastShownReviewPrompt)
    const setLastShownReviewPrompt = usePersistedStore((state) => state.setLastShownReviewPrompt)

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

    const Placeholder = useMemo(() => {
        const emptyCollections = buildPlaceholder({
            isLoading: collectionsQuery.isLoading,
            hasData: filteredCollections.length > 0,
            emptyLabel: 'No collections found',
            isError: collectionsQuery.isError,
            errorLabel: 'Failed to fetch collections',
        })

        return emptyCollections
    }, [collectionsQuery.isLoading, collectionsQuery.isError, filteredCollections.length])
    const { overrideProps } = useFlashlistProps(Placeholder)

    useEffect(() => {
        if (subscriptionStatus.status !== 'INACTIVE') {
            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems(
                    Platform.OS === 'ios'
                        ? [
                              {
                                  id: '0',
                                  title: 'Bugs?',
                                  subtitle: 'Open an issue on GitHub!',
                                  icon: 'mail',
                              },
                          ]
                        : []
                )
            })
            return
        }

        try {
            getPresentationResult('LifetimeOffer_1').then((presentationResult) => {
                if (
                    ['placementnotfound', 'noaudiencematch'].includes(
                        presentationResult.type.toLowerCase()
                    )
                ) {
                    return
                }
                setTimeout(() => {
                    registerPlacement({
                        placement: 'LifetimeOffer_1',
                        feature: () => {
                            Alert.alert('Congrats!', 'You unlocked lifetime access to Pok.')
                        },
                    }).catch((error) => {
                        Sentry.captureException(error)
                        console.error('Error registering LifetimeOffer_1', error)
                    })
                }, 1000)
            })

            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems([
                    {
                        id: '0',
                        title:
                            Platform.OS === 'android'
                                ? "Don't delete me ): Tap here!"
                                : "Don't delete me ):",
                        subtitle: "Here's 50% off for life!",
                        icon: 'love',
                        params: { href: '/?showLfo1=1' },
                    },
                ])
            })
        } catch (error) {
            Sentry.captureException(error)
        }
    }, [registerPlacement, subscriptionStatus.status, getPresentationResult])

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
                                    systemIcon: isLiquidGlassAvailable()
                                        ? connection.id === currentConnection?.id
                                            ? 'smallcircle.filled.circle.fill'
                                            : 'smallcircle.filled.circle'
                                        : undefined,
                                    disabled: connection.id === currentConnection?.id,
                                },
                                {
                                    title: 'Remove',
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

                        if (e.nativeEvent.name === 'Remove') {
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
                                                mmkvStorage.clearAll()
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

                            if (connections.length < 2) {
                                router.push('/login')
                                return
                            }

                            registerPlacement({
                                placement: 'AddConnection',
                                feature: () => {
                                    router.push('/login')
                                },
                            }).catch((error) => {
                                Sentry.captureException(error)
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
                    <HeaderButton
                        style={{
                            marginRight: isLiquidGlassAvailable() ? undefined : 10,
                        }}
                    >
                        <Image
                            source={require('@/assets/icon.png')}
                            borderRadius={16}
                            style={{ width: 32, height: 32 }}
                        />
                    </HeaderButton>
                </ContextMenu>
            ),
            headerRight: () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Icons',
                            systemIcon: 'app.gift',
                        },
                        {
                            title: 'Feedback',
                            systemIcon: 'message',
                        },
                        {
                            title: 'Rate',
                            systemIcon: 'star.fill',
                        },
                    ]}
                    onPress={async (e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                        if (e.nativeEvent.name === 'Icons') {
                            if (__DEV__) {
                                router.push('/icons/')
                                return
                            }

                            registerPlacement({
                                placement: 'AppIcons',
                                feature: () => {
                                    router.push('/icons/')
                                },
                            })
                            return
                        }
                        if (e.nativeEvent.name === 'Feedback') {
                            await WebBrowser.openBrowserAsync(process.env.EXPO_PUBLIC_FEEDBACK_URL!)
                            return
                        }
                        if (e.nativeEvent.name === 'Rate') {
                            Alert.alert('Do you like Pok?', 'Let us know about your experience.', [
                                {
                                    text: 'No',
                                    onPress: () => {
                                        Alert.alert(
                                            'Thank you!',
                                            'Your review has been sent successfully.'
                                        )
                                    },
                                },
                                {
                                    text: 'Yes',
                                    onPress: () => {
                                        if (
                                            usePersistedStore.getState().installationTs <
                                            Date.now() - ms('1d')
                                        ) {
                                            StoreReview.requestReview()
                                            return
                                        }

                                        registerPlacement({
                                            placement: 'LifetimeOffer_1_Show',
                                            feature: async () => {
                                                await StoreReview.requestReview()
                                            },
                                        }).catch((error) => {
                                            Sentry.captureException(error)
                                            console.error(
                                                'Error registering LifetimeOffer_1_Show for Rate',
                                                error
                                            )
                                        })
                                    },
                                },
                            ])
                            return
                        }
                    }}
                >
                    <HeaderTouchableOpacity>
                        <Ionicons name="ellipsis-horizontal-sharp" size={32} color={COLORS.text} />
                    </HeaderTouchableOpacity>
                </ContextMenu>
            ),
            headerSearchBarOptions: {
                placeholder: 'Search',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
                autoCapitalize: 'none',
                tintColor: COLORS.bgLevel2,
                hintTextColor: COLORS.textMuted,
                headerIconColor: COLORS.bgLevel2,
            },
        })
    }, [
        navigation,
        connections,
        currentConnection,
        removeConnection,
        switchConnection,
        registerPlacement,
    ])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={collectionsQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={filteredCollections}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
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

                        if (countToReviewPrompt === 0) {
                            // make sure at least 1 day has passed
                            if (
                                !lastShownReviewPrompt ||
                                lastShownReviewPrompt < Date.now() - ms('1d')
                            ) {
                                setLastShownReviewPrompt(Date.now())
                                setCountToReviewPrompt(12)
                                StoreReview.requestReview()
                            }
                        } else {
                            setCountToReviewPrompt(countToReviewPrompt - 1)
                        }
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
