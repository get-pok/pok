import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import getClient from '@/lib/pb'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router, useNavigation } from 'expo-router'
import { usePlacement } from 'expo-superwall'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Alert, TouchableOpacity, View } from 'react-native'
import { useDebounce } from 'use-debounce'

const log = (...args: any[]) => {
    console.log('[LogsScreen] ', ...args)
}

export default function LogsScreen() {
    const { registerPlacement } = usePlacement()
    const navigation = useNavigation()

    const [filterString, setFilterString] = useState('')
    const [debouncedFilterString] = useDebounce(filterString, 100)

    const logsQuery = useQuery({
        queryKey: ['logs', 'list', debouncedFilterString],
        queryFn: async () => {
            const pb = await getClient()

            let filter = '(data.auth != "_superusers")'

            if (debouncedFilterString) {
                if (
                    debouncedFilterString.includes('=') ||
                    debouncedFilterString.includes('~') ||
                    debouncedFilterString.includes('>') ||
                    debouncedFilterString.includes('<')
                ) {
                    filter += ` && ${debouncedFilterString}`
                } else {
                    filter += ` && (level ~ "${debouncedFilterString}" || message ~ "${debouncedFilterString}" || data ~ "${debouncedFilterString}")`
                }
            }

            const logs = await pb.logs.getList(1, 1000, {
                filter: filter,
                sort: '-created',
            })
            return logs.items
        },
    })

    const logs = useMemo(() => {
        return logsQuery.data || []
    }, [logsQuery.data])

    const Placeholder = useMemo(() => {
        const emptyLogs = buildPlaceholder({
            isLoading: logsQuery.isLoading,
            hasData: logs.length > 0,
            emptyLabel: 'No logs found',
            isError: logsQuery.isError,
            errorLabel: 'Failed to fetch logs',
        })

        return emptyLogs
    }, [logsQuery.isLoading, logsQuery.isError, logs.length])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: `Search term or filter like created > "${new Date().getFullYear()}-01-01"...`,
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                placeholderTextColor: COLORS.textMuted,
                onChangeText: (event: any) => setFilterString(event.nativeEvent.text),
            },
        })
    }, [navigation])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={logsQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={logs}
            overrideProps={
                Placeholder && {
                    contentContainerStyle: {
                        flex: 1,
                    },
                }
            }
            ListEmptyComponent={Placeholder}
            renderItem={({ item: log, index: logIndex }) => (
                <TouchableOpacity
                    style={{
                        backgroundColor: logIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                        padding: 16,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 4,
                    }}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                        if (__DEV__) {
                            router.push(`/log/${log.id}`)
                            return
                        }

                        registerPlacement({
                            placement: 'ExpandLog',
                            feature: () => {
                                router.push(`/log/${log.id}`)
                            },
                        }).catch((error) => {
                            Sentry.captureException(error)
                            console.error('Error registering ExpandLog', error)
                            Alert.alert('Error', 'Something went wrong, please try again.')
                        })
                    }}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text
                            style={{
                                fontSize: 16,
                                color: COLORS.text,
                                fontWeight: 600,
                                marginBottom: 4,
                            }}
                        >
                            {log.message}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {[
                                log.status,
                                log.execTime,
                                log.data.auth || log.data.error ? log.data.auth : 'No Auth',
                                log.data.userIP,
                                log.data.error ? `error: ${log.data.error}` : undefined,
                            ]
                                .filter(Boolean)
                                .map((item) => (
                                    <Text
                                        key={item}
                                        style={{
                                            fontSize: 14,
                                            color: COLORS.text,
                                            padding: 4,
                                            paddingHorizontal: 5,
                                            backgroundColor: item.includes('error')
                                                ? COLORS.danger
                                                : COLORS.bgLevel2,
                                            borderRadius: 4,
                                            borderWidth: 1,
                                            borderColor: COLORS.hr,
                                            borderStyle: 'solid',
                                        }}
                                    >
                                        {item}
                                    </Text>
                                ))}
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Ionicons name="chevron-forward" color={COLORS.textMuted} size={24} />
                    </View>
                </TouchableOpacity>
            )}
        />
    )
}
