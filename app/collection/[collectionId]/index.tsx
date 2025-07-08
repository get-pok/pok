import EmptyListComponent from '@/components/EmptyListComponent'
import getClient from '@/lib/pb'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useDebounce } from 'use-debounce'

const log = (...args: any[]) => {
    console.log('[CollectionsScreen] ', ...args)
}

export default function CollectionsScreen() {
    const { collectionId } = useLocalSearchParams<{ collectionId: string }>()
    const navigation = useNavigation()

    const primaryColumns = usePersistedStore((state) => state.primaryColumns)
    const setPrimaryColumn = usePersistedStore((state) => state.setPrimaryColumn)

    const [filterString, setFilterString] = useState('')
    const [debouncedFilterString] = useDebounce(filterString, 100)

    const collectionQuery = useQuery({
        queryKey: ['collection', collectionId],
        queryFn: async () => {
            const pb = await getClient()

            const records = await pb.collections.getFullList()

            const collection = records.find((record) => record.id === collectionId)
            if (!collection) {
                throw new Error('Collection not found')
            }

            return collection
        },
    })

    const collectionRecordsQuery = useQuery({
        queryKey: ['collection', collectionId, 'records', 'list', debouncedFilterString],
        queryFn: async () => {
            const pb = await getClient()
            const records = await pb.collection(collectionId).getFullList({
                filter:
                    debouncedFilterString.includes('=') ||
                    debouncedFilterString.includes('~') ||
                    debouncedFilterString.includes('>') ||
                    debouncedFilterString.includes('<')
                        ? debouncedFilterString
                        : collectionQuery.data?.fields.reduce((acc, field) => {
                              if (acc) {
                                  return acc + ` || ${field.name}~'${debouncedFilterString}'`
                              }
                              return `${field.name}~'${debouncedFilterString}'`
                          }, ''),
            })

            return records
        },
    })

    const schedules = useMemo(() => {
        return collectionRecordsQuery.data || []
    }, [collectionRecordsQuery.data])

    const primaryColumn = useMemo(() => {
        return primaryColumns[collectionId]
    }, [primaryColumns, collectionId])

    const emptyListComponent = useMemo(() => {
        const emptySchedules = EmptyListComponent({
            isLoading: collectionRecordsQuery.isLoading,
            hasValue: schedules.length > 0,
            emptyLabel: 'No records found',
            error: collectionRecordsQuery.error,
            errorLabel: 'Failed to fetch records',
        })

        if (!emptySchedules && !primaryColumn) {
            return (
                <Text
                    style={{
                        paddingHorizontal: '20%',
                        fontSize: 16,
                        color: COLORS.text,
                        fontWeight: 600,
                        marginTop: 42,
                        textAlign: 'center',
                    }}
                >
                    Please select a primary column to display your records.
                </Text>
            )
        }

        return emptySchedules
    }, [
        collectionRecordsQuery.isLoading,
        collectionRecordsQuery.error,
        schedules.length,
        primaryColumn,
    ])

    useLayoutEffect(() => {
        navigation.setOptions({
            title: collectionQuery.data?.name
                ? `${collectionQuery.data?.name} ` +
                  (collectionRecordsQuery.data?.length !== undefined
                      ? `(${collectionRecordsQuery.data.length})`
                      : '')
                : '',
            headerSearchBarOptions: {
                placeholder: `Search term or filter like created > "${new Date().getFullYear()}-01-01"...`,
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                placeholderTextColor: COLORS.textMuted,
                onChangeText: (event: any) => setFilterString(event.nativeEvent.text),
            },
        })
    }, [navigation, collectionQuery.data?.name, collectionRecordsQuery.data?.length])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    tintColor={COLORS.info}
                    refreshing={collectionRecordsQuery.isRefetching}
                    onRefresh={collectionRecordsQuery.refetch}
                    // android
                    progressBackgroundColor={COLORS.bgLevel1}
                    colors={[COLORS.info]}
                />
            }
            showsVerticalScrollIndicator={false}
            data={primaryColumn ? schedules : []}
            overrideProps={
                emptyListComponent && {
                    contentContainerStyle: {
                        flex: 1,
                    },
                }
            }
            ListEmptyComponent={emptyListComponent}
            extraData={primaryColumn}
            renderItem={({ item: record, index: recordIndex }) => {
                return (
                    <TouchableOpacity
                        style={{
                            backgroundColor: recordIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                            padding: 16,
                            paddingHorizontal: 20,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            router.push(`/collection/${collectionId}/${record.id}`)
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: COLORS.text,
                                    fontWeight: 600,
                                }}
                            >
                                {/* @ts-ignore */}
                                {typeof record[primaryColumn!] === 'boolean'
                                    ? record[primaryColumn!]
                                        ? 'True'
                                        : 'False'
                                    : record[primaryColumn!]}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Ionicons name="chevron-forward" color={COLORS.textMuted} size={24} />
                        </View>
                    </TouchableOpacity>
                )
            }}
            ListHeaderComponent={() => (
                <ScrollView
                    style={{
                        // backgroundColor: 'red',
                        paddingBottom: 16,
                        borderBottomWidth: 1,
                        borderColor: COLORS.hr,
                        borderStyle: 'solid',
                    }}
                    contentContainerStyle={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                        paddingHorizontal: 20,
                    }}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                >
                    {collectionQuery.data?.fields.map((field) => (
                        <TouchableOpacity
                            key={field.id}
                            style={{
                                padding: 10,
                                borderRadius: 10,
                                backgroundColor:
                                    primaryColumn === field.name
                                        ? COLORS.bgLevel2
                                        : COLORS.bgLevel1,
                                borderWidth: primaryColumn !== field.name ? 1 : 0,
                                borderColor: COLORS.hr,
                                borderStyle: 'solid',
                            }}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                setPrimaryColumn(collectionId, field.name)
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    color:
                                        primaryColumn === field.name
                                            ? COLORS.text
                                            : COLORS.textMuted,
                                    fontWeight: primaryColumn === field.name ? 500 : 400,
                                }}
                            >
                                {field.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        />
    )
}
