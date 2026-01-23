import Text from '@/components/base/Text'
import getClient from '@/lib/pb'
import { invalidateCurrentConnection, queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { useMutation } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { usePlacement } from 'expo-superwall'
import PocketBase from 'pocketbase'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Image, Platform, TextInput, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
    const navigation = useNavigation()
    const { registerPlacement } = usePlacement()

    const connections = usePersistedStore((state) => state.connections)
    const addConnection = usePersistedStore((state) => state.addConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const urlRef = useRef<string>('')
    const emailRef = useRef<string>('')
    const passwordRef = useRef<string>('')

    const [isModal, setIsModal] = useState(false)

    const showCloseButton = useMemo(() => {
        return Platform.OS === 'android' && isModal
    }, [isModal])

    const validateAuth = useCallback(
        async ({ url, email, password }: { url: string; email: string; password: string }) => {
            try {
                const client = new PocketBase(url)

                await client.collection('_superusers').authWithPassword(email, password)

                if (!client.authStore.record) {
                    throw new Error('Invalid credentials')
                }

                if (client.authStore.record.collectionName !== '_superusers') {
                    throw new Error('You must be a superuser to manage instances')
                }

                return client.authStore
            } catch (error) {
                console.error('[validateAuth] error', error)
                Alert.alert('Invalid token', 'Please enter valid Pocketbase credentials')
                return undefined
            }
        },
        []
    )

    const loginMutation = useMutation({
        mutationFn: async () => {
            const url = urlRef.current.trim() || ''
            const email = emailRef.current.trim() || ''
            const password = passwordRef.current.trim() || ''

            if (!url) {
                throw new Error('Please enter an URL')
            }

            if (!email || !password) {
                throw new Error('Please enter an email and password')
            }

            const validatedAuth = await validateAuth({ url, email, password })

            console.log('[loginMutation] validatedAuth', validatedAuth)

            if (!validatedAuth || !validatedAuth.record) {
                throw new Error('Invalid token')
            }

            if (connections.find((c) => c.url === url)) {
                throw new Error('You are already connected to this instance')
            }

            addConnection({
                id: validatedAuth.record.id,
                url,
                email,
                password,
            })

            await invalidateCurrentConnection()

            switchConnection({ connectionId: validatedAuth.record.id })

            if (connections.length === 1) {
                registerPlacement({
                    placement: 'SuccessfulLogin',
                }).catch()
            }

            await queryClient.prefetchQuery({
                queryKey: ['settings'],
                queryFn: async () => {
                    const pb = await getClient()
                    const settings = await pb.settings.getAll()
                    return settings
                },
            })

            return validatedAuth
        },
        onSuccess: () => {
            router.dismissTo('/')
        },
        onError: (error) => {
            console.error('[loginMutation] error', error)
            Alert.alert('Error', error.message || 'Could not connect to Pocketbase instance')
        },
    })

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        setIsModal(connections.length > 0)
    }, [])

    useLayoutEffect(() => {
        navigation.setOptions({
            gestureEnabled: isModal,
            // animation: isModal ? undefined : 'none',
        })
    }, [navigation, isModal])

    return (
        <SafeAreaView style={{ flex: 1 }} edges={Platform.OS === 'android' ? ['top'] : []}>
            <KeyboardAwareScrollView
                bottomOffset={20}
                extraKeyboardSpace={70}
                keyboardShouldPersistTaps="handled"
                style={{
                    flex: 1,
                    backgroundColor: COLORS.bgApp,
                }}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingTop: isModal ? 60 : 120,
                    paddingBottom: 280,
                }}
                showsVerticalScrollIndicator={false}
            >
                {showCloseButton && (
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: -50, // to negate the paddingTop
                            right: 30,
                            backgroundColor: '#ffffff28',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 16,
                            height: 32,
                            width: 32,
                        }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="close" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                )}

                <View
                    style={{
                        flexGrow: 1,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignSelf: 'center',
                        gap: 48,
                        maxWidth: 320,
                        width: '100%',
                    }}
                >
                    <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{
                                width: 250,
                                height: 250,
                                // extra
                                marginBottom: 24,
                                borderRadius: 12,
                            }}
                            resizeMode="contain"
                        />
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                textAlign: 'center',
                                color: COLORS.text,
                            }}
                        >
                            {isModal ? 'Add Connection' : 'Welcome to POK'}
                        </Text>
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: 400,
                                textAlign: 'center',
                                color: COLORS.warningLighter,
                            }}
                        >
                            {isModal
                                ? 'Add an API token for a new connection!'
                                : 'Add your API token to get started!'}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'column', gap: 20 }}>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                            <Text style={{ color: COLORS.text }}>URL</Text>
                            <TextInput
                                style={{
                                    height: 48,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    backgroundColor: COLORS.bgLevel1,
                                    color: COLORS.infoLighter,
                                    fontSize: 16,
                                    borderWidth: 1,
                                    borderColor: COLORS.hr,
                                    borderStyle: 'solid',
                                }}
                                placeholder="Your Pocketbase URL"
                                placeholderTextColor={COLORS.textMuted}
                                onChangeText={(text) => {
                                    urlRef.current = text
                                }}
                                returnKeyLabel="Next"
                                returnKeyType="next"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                            />
                        </View>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                            <Text style={{ color: COLORS.text }}>Email</Text>
                            <TextInput
                                style={{
                                    height: 48,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    backgroundColor: COLORS.bgLevel1,
                                    color: COLORS.infoLighter,
                                    fontSize: 16,
                                    borderWidth: 1,
                                    borderColor: COLORS.hr,
                                    borderStyle: 'solid',
                                }}
                                placeholder="Enter an email"
                                placeholderTextColor={COLORS.textMuted}
                                onChangeText={(text) => {
                                    emailRef.current = text
                                }}
                                returnKeyLabel="Next"
                                returnKeyType="next"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                            />
                        </View>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                            <Text style={{ color: COLORS.text }}>Password</Text>
                            <TextInput
                                style={{
                                    height: 48,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    backgroundColor: COLORS.bgLevel1,
                                    color: COLORS.infoLighter,
                                    fontSize: 16,
                                    borderWidth: 1,
                                    borderColor: COLORS.hr,
                                    borderStyle: 'solid',
                                }}
                                placeholder="Enter a password"
                                placeholderTextColor={COLORS.textMuted}
                                secureTextEntry={true}
                                onChangeText={(text) => {
                                    passwordRef.current = text
                                }}
                                returnKeyLabel="Connect"
                                returnKeyType="go"
                                onSubmitEditing={() => loginMutation.mutate()}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                            />
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <Button
                                title={loginMutation.isPending ? 'Connecting...' : 'Connect'}
                                onPress={() => loginMutation.mutate()}
                                disabled={loginMutation.isPending}
                                color={COLORS.infoLighter}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}
