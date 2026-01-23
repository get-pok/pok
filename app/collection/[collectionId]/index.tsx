import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import WidgetMessage from '@/components/base/WidgetMessage'
import { useFlashlistProps } from '@/lib/hooks'
import getClient from '@/lib/pb'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Checkbox from 'expo-checkbox'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'
import { useDebounce } from 'use-debounce'

const log = (...args: any[]) => {
    console.log('[CollectionScreen] ', ...args)
}

export default function CollectionScreen() {
    const { collectionId, _pickerMode, _targetField, _returnTo, _isArrayRelation } =
        useLocalSearchParams<{
            collectionId: string
            _pickerMode?: string
            _targetField?: string
            _returnTo?: string
            _isArrayRelation?: string
        }>()
    const navigation = useNavigation()
    const queryClient = useQueryClient()
    const isPickerMode = useMemo(() => _pickerMode === 'true', [_pickerMode])
    const isArrayRelation = useMemo(() => _isArrayRelation === 'true', [_isArrayRelation])

    const primaryColumns = usePersistedStore((state) => state.primaryColumns)
    const setPrimaryColumn = usePersistedStore((state) => state.setPrimaryColumn)

    const [filterString, setFilterString] = useState('')
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useFocusEffect(
        useCallback(() => {
            return () => {
                setIsSelectionMode(false)
                setSelectedIds(new Set())
            }
        }, [])
    )

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const deleteSelectedMutation = useMutation({
        mutationFn: async () => {
            const pb = await getClient()
            await Promise.all(
                Array.from(selectedIds).map((id) => pb.collection(collectionId).delete(id))
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId, 'records', 'list'],
            })
            setSelectedIds(new Set())
            setIsSelectionMode(false)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

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

    const records = useMemo(() => {
        return collectionRecordsQuery.data || []
    }, [collectionRecordsQuery.data])

    const primaryColumn = useMemo(() => {
        return primaryColumns[collectionId]
    }, [primaryColumns, collectionId])

    const Placeholder = useMemo(() => {
        const emptyRecords = buildPlaceholder({
            isLoading: collectionRecordsQuery.isLoading,
            hasData: records.length > 0,
            emptyLabel: 'No records found',
            isError: collectionRecordsQuery.isError,
            errorLabel: 'Failed to fetch records',
        })

        if (!emptyRecords && !primaryColumn) {
            return (
                <Text
                    style={{
                        paddingHorizontal: '20%',
                        fontSize: 16,
                        color: COLORS.text,
                        fontWeight: 500,
                        marginTop: 42,
                        textAlign: 'center',
                    }}
                    full={true}
                >
                    Please select a primary column to display your records.
                </Text>
            )
        }

        return emptyRecords
    }, [
        collectionRecordsQuery.isLoading,
        collectionRecordsQuery.isError,
        records.length,
        primaryColumn,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    const getHeaderRight = useCallback(() => {
        if (isPickerMode) {
            if (!isArrayRelation) return undefined
            return () => (
                <HeaderTouchableOpacity
                    onPress={() => {
                        if (_returnTo && _targetField) {
                            const selectedIdsStr = Array.from(selectedIds).join(',')
                            router.dismissTo(
                                `/collection/${_returnTo}/add?relationSelectedId=${selectedIdsStr}&relationTargetField=${_targetField}`
                            )
                        }
                    }}
                >
                    <Ionicons
                        name="checkmark"
                        size={isLiquidGlassAvailable() ? 28 : 24}
                        color={COLORS.info}
                    />
                </HeaderTouchableOpacity>
            )
        }

        if (isSelectionMode) {
            const actions = [
                { title: 'Deselect All', systemIcon: 'xmark' },
                ...(selectedIds.size > 0
                    ? [
                          {
                              title: `Delete (${selectedIds.size})`,
                              systemIcon: 'trash',
                              destructive: true,
                          },
                      ]
                    : []),
            ]
            return () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={actions}
                    onPress={(e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                        if (e.nativeEvent.name === 'Deselect All') {
                            setSelectedIds(new Set())
                            setIsSelectionMode(false)
                        } else if (e.nativeEvent.name.startsWith('Delete')) {
                            Alert.alert(
                                'Delete Records',
                                `Are you sure you want to delete ${selectedIds.size} record(s)?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => deleteSelectedMutation.mutate(),
                                    },
                                ]
                            )
                        }
                    }}
                >
                    <HeaderTouchableOpacity>
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={isLiquidGlassAvailable() ? 32 : 18}
                            color={COLORS.text}
                        />
                    </HeaderTouchableOpacity>
                </ContextMenu>
            )
        }

        return () => (
            <ContextMenu
                dropdownMenuMode={true}
                actions={[
                    { title: 'Add Record', systemIcon: 'plus' },
                    { title: 'Select', systemIcon: 'checkmark' },
                ]}
                onPress={(e) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    if (e.nativeEvent.name === 'Add Record') {
                        router.push(`/collection/${collectionId}/add`)
                    } else if (e.nativeEvent.name === 'Select') {
                        setIsSelectionMode(true)
                    }
                }}
            >
                <HeaderTouchableOpacity>
                    <Ionicons
                        name="ellipsis-horizontal"
                        size={isLiquidGlassAvailable() ? 32 : 18}
                        color={COLORS.text}
                    />
                </HeaderTouchableOpacity>
            </ContextMenu>
        )
    }, [
        isPickerMode,
        isArrayRelation,
        selectedIds,
        _returnTo,
        _targetField,
        isSelectionMode,
        collectionId,
        deleteSelectedMutation.mutate,
    ])

    useLayoutEffect(() => {
        const baseTitle = collectionQuery.data?.name
            ? `${collectionQuery.data?.name} ` +
              (collectionRecordsQuery.data?.length !== undefined
                  ? `(${collectionRecordsQuery.data.length})`
                  : '')
            : ''

        const title = isPickerMode
            ? `Select ${collectionQuery.data?.name || ''}${isSelectionMode || isPickerMode ? ` (${selectedIds.size})` : ''}`
            : baseTitle

        navigation.setOptions({
            title,
            headerRight: getHeaderRight(),
            headerSearchBarOptions: {
                placeholder: `Search term or filter like created > "${new Date().getFullYear()}-01-01"...`,
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                onChangeText: (event: any) => setFilterString(event.nativeEvent.text),
                autoCapitalize: 'none',
                tintColor: COLORS.bgLevel2,
                hintTextColor: COLORS.textMuted,
                headerIconColor: COLORS.bgLevel2,
            },
        })
    }, [
        navigation,
        collectionQuery.data?.name,
        collectionRecordsQuery.data?.length,
        isPickerMode,
        isSelectionMode,
        selectedIds.size,
        getHeaderRight,
    ])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={collectionRecordsQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={primaryColumn ? records : []}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            extraData={[primaryColumn, isSelectionMode, isPickerMode, isArrayRelation, selectedIds]}
            renderItem={({ item: record, index: recordIndex }) => {
                const showCheckbox = isSelectionMode || (isPickerMode && isArrayRelation)
                const isSelected = selectedIds.has(record.id)

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
                            if (isPickerMode && !isArrayRelation && _returnTo && _targetField) {
                                router.dismissTo(
                                    `/collection/${_returnTo}/add?relationSelectedId=${record.id}&relationTargetField=${_targetField}`
                                )
                                return
                            }
                            if (showCheckbox) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                toggleSelection(record.id)
                                return
                            }
                            router.push(`/collection/${collectionId}/${record.id}`)
                        }}
                    >
                        {showCheckbox && (
                            <View style={{ marginRight: 12 }}>
                                <Checkbox
                                    value={isSelected}
                                    onValueChange={() => toggleSelection(record.id)}
                                    color={isSelected ? COLORS.info : undefined}
                                />
                            </View>
                        )}
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
                        {!showCheckbox && (
                            <View style={{ alignItems: 'flex-end' }}>
                                <Ionicons
                                    name="chevron-forward"
                                    color={COLORS.textMuted}
                                    size={24}
                                />
                            </View>
                        )}
                    </TouchableOpacity>
                )
            }}
            ListHeaderComponent={() => (
                <View>
                    <WidgetMessage
                        message={`Create a shortcut for ${collectionQuery.data?.name || 'this collection'} on your homescreen!`}
                        style={{ padding: 20, paddingBottom: 16, paddingTop: 0 }}
                    />
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
                </View>
            )}
        />
    )
}
