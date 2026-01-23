import { WidgetSyncer } from '@/components/base/WidgetSyncer'
import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { COLORS } from '@/theme/colors'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { activateKeepAwakeAsync } from 'expo-keep-awake'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { SplashScreen, Stack, useNavigationContainerRef } from 'expo-router'
import { SuperwallProvider } from 'expo-superwall'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
})

const mmkvPersister = createSyncStoragePersister({
    storage: mmkvStorage,
})

// const clearStorage = () => {
//     mmkvStorage.clearAll()
//     queryClient.clear()
// }
// clearStorage()

function RootLayout() {
    const commonHeaderStyle = {
        headerTransparent: Platform.OS === 'ios',
        headerStyle: isLiquidGlassAvailable()
            ? undefined
            : {
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

    useQuickActionRouting()
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
        <SafeAreaProvider>
            <GestureHandlerRootView>
                <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
                    <SuperwallProvider
                        apiKeys={{
                            ios: process.env.EXPO_PUBLIC_IOS_SUPERWALL_API_KEY,
                            android: process.env.EXPO_PUBLIC_ANDROID_SUPERWALL_API_KEY,
                        }}
                    >
                        <WidgetSyncer>
                            <PersistQueryClientProvider
                                client={queryClient}
                                persistOptions={{
                                    persister: mmkvPersister,
                                    dehydrateOptions: {
                                        shouldDehydrateQuery: (query) =>
                                            query.state.status !== 'pending' &&
                                            query.state.status !== 'error' &&
                                            query.state.data !== undefined,
                                    },
                                }}
                            >
                                <Stack
                                    screenOptions={{
                                        navigationBarHidden: true,
                                    }}
                                >
                                    <Stack.Screen
                                        name="index"
                                        options={{
                                            title: '',
                                            headerShown: false,
                                            gestureEnabled: false,
                                            contentStyle: {
                                                backgroundColor: COLORS.bgApp,
                                            },
                                        }}
                                    />

                                    <Stack.Screen
                                        name="onboard/index"
                                        options={{
                                            headerShown: false,
                                            gestureEnabled: false,
                                            animation: 'none',
                                        }}
                                    />

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
                                        name="collection/[collectionId]/add"
                                        options={{
                                            title: 'New Record',
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

                                    <Stack.Screen
                                        name="icons/index"
                                        options={{
                                            title: 'App Icon',
                                            ...commonHeaderStyle,
                                            ...commonContentStyle,
                                            autoHideHomeIndicator: true,
                                        }}
                                    />
                                </Stack>
                            </PersistQueryClientProvider>
                        </WidgetSyncer>
                    </SuperwallProvider>
                </KeyboardProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    )
}

export default RootLayout
