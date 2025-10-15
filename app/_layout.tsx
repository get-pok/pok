import { queryClient } from '@/lib/query'
import { storage } from '@/lib/storage'
import { COLORS } from '@/theme/colors'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { activateKeepAwakeAsync } from 'expo-keep-awake'
import { SplashScreen, Stack, useNavigationContainerRef } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    // biome-ignore lint/correctness/noUndeclaredVariables: <>
    environment: __DEV__ ? 'development' : 'production',
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
})

const mmkvPersister = createSyncStoragePersister({
    storage: {
        getItem: (key) => {
            const value = storage.getString(key)
            return value ?? null
        },
        setItem: (key, value) => {
            storage.set(key, value)
        },
        removeItem: (key) => {
            storage.delete(key)
        },
    },
})

// const clearStorage = () => {
//     storage.clearAll()
//     queryClient.clear()
// }
// clearStorage()

function RootLayout() {
    const commonHeaderStyle = {
        headerTransparent: Platform.OS === 'ios',
        headerStyle: {
            backgroundColor: COLORS.bgApp,
        },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
    }

    const commonContentStyle = {
        contentStyle: {
            backgroundColor: COLORS.bgApp,
        },
    }

    const ref = useNavigationContainerRef()

    useEffect(() => {
        if (ref?.current) {
            navigationIntegration.registerNavigationContainer(ref)
        }
    }, [ref])

    useEffect(() => {
        SplashScreen.hide()
        activateKeepAwakeAsync()
    }, [])

    return (
        <GestureHandlerRootView>
            <KeyboardProvider>
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{
                        persister: mmkvPersister,
                        dehydrateOptions: {
                            shouldDehydrateQuery: (query) => query.state.data !== undefined,
                        },
                    }}
                >
                    <Stack
                        screenOptions={{
                            navigationBarHidden: true,
                        }}
                    >
                        <Stack.Screen
                            name="login/index"
                            options={{
                                title: 'Login',
                                headerShown: false,
                                // gestureEnabled: false,
                                // animation: 'none',
                                presentation: 'modal',
                                ...commonContentStyle,
                                autoHideHomeIndicator: true,
                            }}
                        />

                        <Stack.Screen
                            name="(tabs)"
                            options={{
                                title: 'Home',
                                headerShown: false,
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                autoHideHomeIndicator: true,
                            }}
                        />

                        <Stack.Screen
                            name="collection/[collectionId]/index"
                            options={{
                                title: '',
                                headerLargeTitle: true,
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                            }}
                        />

                        <Stack.Screen
                            name="collection/[collectionId]/[recordId]"
                            options={{
                                title: '',
                                headerLargeTitle: true,
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                headerShadowVisible: true,
                            }}
                        />

                        <Stack.Screen
                            name="log/[logId]"
                            options={{
                                title: 'Log Details',
                                headerLargeTitle: true,
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                headerShadowVisible: true,
                            }}
                        />
                    </Stack>
                </PersistQueryClientProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    )
}

export default RootLayout
