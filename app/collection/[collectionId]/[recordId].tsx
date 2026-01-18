import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import getClient from '@/lib/pb'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import Clipboard from '@react-native-clipboard/clipboard'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Checkbox from 'expo-checkbox'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useNavigation } from 'expo-router'
import { usePlacement } from 'expo-superwall'
import * as WebBrowser from 'expo-web-browser'
import ms from 'ms'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, TextInput, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const log = (...args: any[]) => {
    console.log('[RecordScreen] ', ...args)
}

export default function RecordScreen() {
    const { collectionId, recordId } = useLocalSearchParams<{
        collectionId: string
        recordId: string
    }>()
    const { registerPlacement } = usePlacement()
    const navigation = useNavigation()
    const queryClient = useQueryClient()

    const primaryColumns = usePersistedStore((state) => state.primaryColumns)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)
    const acknowledge = usePersistedStore((state) => state.acknowledge)

    const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({})
    const [editableRecord, setEditableRecord] = useState<
        Record<string, string | undefined | null | boolean>
    >({})

    const collectionQuery = useQuery({
        queryKey: ['collection', collectionId],
        queryFn: async () => {
            const pb = await getClient()
            const collections = await pb.collections.getFullList()
            return collections.find((collection) => collection.id === collectionId)
        },
    })

    const recordQuery = useQuery({
        queryKey: ['collection', collectionId, 'records', recordId],
        queryFn: async () => {
            const pb = await getClient()
            const record = await pb
                .collection(collectionId)
                .getOne(recordId)
                .catch((error) => {
                    log('Error fetching record', error)
                    return null
                })
            return record
        },
        staleTime: ms('10m'),
    })

    const updateRecordMutation = useMutation({
        mutationFn: async () => {
            const mutationFields = Object.fromEntries(
                Object.entries(editableRecord).filter(([_, value]) => value !== undefined) as [
                    string,
                    string,
                ][]
            )
            const pb = await getClient()
            await pb.collection(collectionId).update(recordId, mutationFields)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId, 'records', recordId],
            })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteRecordMutation = useMutation({
        mutationFn: async () => {
            const pb = await getClient()
            await pb.collection(collectionId).delete(recordId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId, 'records', 'list'],
            })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const duplicateRecordMutation = useMutation({
        mutationFn: async () => {
            const filteredFields = ['id', 'collectionId', 'collectionName', 'created', 'updated']
            const pb = await getClient()
            const createdRecord = await pb
                .collection(collectionId)
                .create(
                    Object.fromEntries(
                        Object.entries(record!).filter(([key]) => !filteredFields.includes(key))
                    )
                )
                .catch((error) => {
                    if (error?.response?.data) {
                        throw new Error(JSON.stringify(error.response.data, null, 2))
                    }
                    throw new Error(JSON.stringify(error, null, 2))
                })
            return createdRecord.id
        },
        onSuccess: (newRecordId) => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId, 'records', 'list'],
            })
            router.back()
            router.push(`/collection/${collectionId}/${newRecordId}`)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const openFileMutation = useMutation({
        mutationFn: async () => {
            if (!record) throw new Error('Record not found')
            const pb = await getClient()
            const token = await pb.files.getToken()
            const downloadURL = pb.files.getURL(record, record.file, {
                token,
            })

            return downloadURL
        },
        onSuccess: (url) => {
            WebBrowser.openBrowserAsync(url)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const primaryColumn = useMemo(() => {
        return primaryColumns[collectionId]
    }, [primaryColumns, collectionId])

    const record = useMemo(() => {
        return recordQuery.data
    }, [recordQuery.data])

    const hasChanges = useMemo(() => {
        return Object.keys(editableRecord).some(
            (key) => editableRecord?.[key] !== undefined && editableRecord[key] !== record?.[key]
        )
    }, [editableRecord, record])

    const isLoading = useMemo(() => {
        return (
            updateRecordMutation.isPending ||
            deleteRecordMutation.isPending ||
            duplicateRecordMutation.isPending
        )
    }, [
        updateRecordMutation.isPending,
        deleteRecordMutation.isPending,
        duplicateRecordMutation.isPending,
    ])

    const Placeholder = useMemo(() => {
        const emptyRecord = buildPlaceholder({
            isLoading: recordQuery.isLoading,
            isError: recordQuery.isError,
            hasData: !!record,
            emptyLabel: 'Record not found',
            errorLabel: 'Error fetching record',
        })

        return emptyRecord
    }, [recordQuery.isLoading, recordQuery.isError, record])

    useEffect(() => {
        if (record) {
            // @ts-ignore
            setEditableRecord({ ...record, collectionId: undefined, collectionName: undefined })
        }
    }, [record])

    useLayoutEffect(() => {
        if (!record || !primaryColumn) return
        navigation.setOptions({
            title: record[primaryColumn] || '',
            headerRight: isLoading
                ? () => (
                      <HeaderItem>
                          <ActivityIndicator
                              style={isLiquidGlassAvailable() ? undefined : { marginRight: 10 }}
                              sm={true}
                              monochrome={true}
                          />
                      </HeaderItem>
                  )
                : hasChanges
                  ? () => (
                        <HeaderTouchableOpacity
                            onPress={() => {
                                if (!hasChanges) return
                                updateRecordMutation.mutate()
                            }}
                            style={isLiquidGlassAvailable() ? undefined : { padding: 10 }}
                        >
                            <Ionicons
                                name="save"
                                size={isLiquidGlassAvailable() ? 24 : 20}
                                color={COLORS.text}
                            />
                        </HeaderTouchableOpacity>
                    )
                  : () => (
                        <ContextMenu
                            dropdownMenuMode={true}
                            actions={[
                                {
                                    title: 'Close',
                                    systemIcon: 'xmark',
                                },
                                {
                                    title: 'Copy Raw JSON',
                                    systemIcon: 'doc.text',
                                },
                                {
                                    title: 'Duplicate',
                                    systemIcon: 'plus',
                                },
                                {
                                    title: 'Delete',
                                    destructive: true,
                                    systemIcon: 'trash',
                                },
                            ]}
                            onPress={(e) => {
                                if (e.nativeEvent.name === 'Close') {
                                    if (!acknowledged.swipeLeft) {
                                        acknowledge('swipeLeft')
                                        Alert.alert('Quick Tip', 'You can swipe left to go back!', [
                                            { text: 'Good to know!', style: 'cancel' },
                                        ])
                                    }
                                    router.back()
                                    return
                                }

                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                if (e.nativeEvent.name === 'Duplicate') {
                                    duplicateRecordMutation.mutate()
                                    return
                                }

                                if (e.nativeEvent.name === 'Copy Raw JSON') {
                                    Clipboard.setString(JSON.stringify(record, null, 2))
                                    Alert.alert(
                                        'Copied to clipboard',
                                        'The raw JSON has been copied to your clipboard.'
                                    )
                                    return
                                }

                                if (e.nativeEvent.name === 'Delete') {
                                    Alert.alert('Are you sure?', 'This action cannot be undone.', [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: () => {
                                                Alert.alert(
                                                    'Are you super duper sure?',
                                                    'The record will be deleted and cannot be recovered.',
                                                    [
                                                        {
                                                            text: 'Cancel',
                                                            style: 'cancel',
                                                        },
                                                        {
                                                            text: 'Delete record',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                deleteRecordMutation.mutate()
                                                                return
                                                            },
                                                        },
                                                    ]
                                                )
                                            },
                                        },
                                    ])
                                    return
                                }
                            }}
                        >
                            <HeaderTouchableOpacity
                                style={
                                    isLiquidGlassAvailable()
                                        ? undefined
                                        : {
                                              backgroundColor: COLORS.bgLevel2,
                                              justifyContent: 'center',
                                              alignItems: 'center',
                                              borderRadius: 16,
                                              height: 32,
                                              width: 32,
                                          }
                                }
                            >
                                <Ionicons
                                    name="ellipsis-horizontal"
                                    size={isLiquidGlassAvailable() ? 32 : 18}
                                    color={COLORS.text}
                                />
                            </HeaderTouchableOpacity>
                        </ContextMenu>
                    ),
        })
    }, [
        navigation,
        record,
        primaryColumn,
        hasChanges,
        isLoading,
        acknowledge,
        acknowledged.swipeLeft,
        updateRecordMutation.mutate,
        deleteRecordMutation.mutate,
        duplicateRecordMutation.mutate,
    ])

    // pleasing compiler
    if (Placeholder || !record) {
        return Placeholder
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={<RefreshControl onRefresh={recordQuery.refetch} />}
        >
            {collectionQuery.data?.fields.map((field, fieldIndex) => {
                const fieldValue = record[field.name]

                if (field.name === 'id') {
                    return (
                        <Field
                            key={field.id}
                            backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                        >
                            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                                {field.name}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    Clipboard.setString(fieldValue)
                                    setCopiedFields((prev) => ({ ...prev, [field.name]: true }))
                                    setTimeout(() => {
                                        setCopiedFields((prev) => ({
                                            ...prev,
                                            [field.name]: false,
                                        }))
                                    }, 2000)
                                }}
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: 10,
                                    borderRadius: 5,
                                    backgroundColor: COLORS.bgLevel2,
                                }}
                            >
                                <Ionicons name="copy" size={20} color={COLORS.text} />
                                <Text style={{ color: COLORS.text, fontSize: 16 }}>
                                    {copiedFields[field.name] ? 'Copied!' : fieldValue}
                                </Text>
                            </TouchableOpacity>
                        </Field>
                    )
                }

                if (field.type === 'file') {
                    return (
                        <Field
                            key={field.id}
                            backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                        >
                            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                                {field.name}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: 10,
                                    borderRadius: 5,
                                    backgroundColor: COLORS.bgLevel2,
                                }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                                    if (__DEV__) {
                                        openFileMutation.mutate()
                                        return
                                    }

                                    registerPlacement({
                                        placement: 'OpenFile',
                                        feature: () => openFileMutation.mutate(),
                                    }).catch((error) => {
                                        Sentry.captureException(error)
                                        console.error('Error registering OpenFile', error)
                                        Alert.alert(
                                            'Error',
                                            'Something went wrong, please try again.'
                                        )
                                    })
                                }}
                            >
                                <Ionicons name="eye" size={20} color={COLORS.text} />
                                <Text style={{ color: COLORS.text, fontSize: 16 }}>
                                    {copiedFields[field.name] ? 'Copied!' : fieldValue}
                                </Text>
                            </TouchableOpacity>
                        </Field>
                    )
                }

                if (field.type === 'select') {
                    return (
                        <Field
                            key={field.id}
                            backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                        >
                            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                                {field.name}
                            </Text>

                            <View
                                key={field.id}
                                style={{
                                    flexDirection: 'column',
                                    gap: 5,
                                }}
                            >
                                {field.values.map((option: string) => {
                                    return (
                                        <View
                                            key={option}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 7,
                                            }}
                                        >
                                            <Checkbox
                                                value={editableRecord[field.name] === option}
                                                onValueChange={(value) => {
                                                    setEditableRecord((prev) => ({
                                                        ...prev,
                                                        [field.name]: value ? option : null,
                                                    }))
                                                }}
                                            />

                                            <Text style={{ color: COLORS.text, fontSize: 16 }}>
                                                {option}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>
                        </Field>
                    )
                }

                if (field.type === 'bool') {
                    return (
                        <Field
                            key={field.id}
                            backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                        >
                            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                                {field.name}
                            </Text>

                            <View
                                key={field.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 7,
                                }}
                            >
                                <Checkbox
                                    // @ts-ignore
                                    value={editableRecord[field.name] || false}
                                    onValueChange={(value) => {
                                        setEditableRecord((prev) => ({
                                            ...prev,
                                            [field.name]: value,
                                        }))
                                    }}
                                />

                                <Text style={{ color: COLORS.text, fontSize: 16 }}>
                                    {editableRecord[field.name] ? 'True' : 'False'}
                                </Text>
                            </View>
                        </Field>
                    )
                }

                if (field.type === 'relation') {
                    return (
                        <RelationFieldDisplay
                            key={field.id}
                            fieldName={field.name}
                            targetCollectionId={field.collectionId}
                            value={fieldValue}
                            backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                        />
                    )
                }

                return (
                    <Field
                        key={field.id}
                        backgroundColor={fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined}
                    >
                        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                            {field.name}
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: COLORS.bgLevel2,
                                borderRadius: 5,
                                padding: 10,
                                color: COLORS.text,
                                fontSize: 16,
                                minHeight: fieldValue?.length > 100 ? 250 : undefined,
                            }}
                            editable={true}
                            defaultValue={fieldValue}
                            onChangeText={(text) => {
                                setEditableRecord((prev) => ({
                                    ...prev,
                                    [field.name]: text,
                                }))
                            }}
                            placeholder="Enter value"
                            placeholderTextColor={COLORS.textMuted}
                            multiline={fieldValue?.length > 100}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                    </Field>
                )
            })}
        </ScrollView>
    )
}

function Field({
    children,
    backgroundColor,
}: { children: React.ReactNode; backgroundColor?: string }) {
    return (
        <View
            style={{
                flexDirection: 'column',
                gap: 10,
                padding: 20,
                paddingTop: 10,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.hr,
                backgroundColor,
            }}
        >
            {children}
        </View>
    )
}

function RelationFieldDisplay({
    fieldName,
    targetCollectionId,
    value,
    backgroundColor,
}: {
    fieldName: string
    targetCollectionId: string
    value: string | string[] | null
    backgroundColor?: string
}) {
    const primaryColumns = usePersistedStore((state) => state.primaryColumns)
    const primaryColumn = primaryColumns[targetCollectionId]

    const selectedIds = useMemo(() => {
        if (!value) return []
        if (Array.isArray(value)) return value
        return [value]
    }, [value])

    const selectedRecordsQuery = useQuery({
        queryKey: ['collection', targetCollectionId, 'records', 'batch', selectedIds],
        queryFn: async () => {
            if (selectedIds.length === 0) return []
            const pb = await getClient()
            const records = await Promise.all(
                selectedIds.map((id) =>
                    pb
                        .collection(targetCollectionId)
                        .getOne(id)
                        .catch(() => null)
                )
            )
            return records.filter(Boolean)
        },
        enabled: selectedIds.length > 0,
    })

    const getRecordDisplayValue = useCallback(
        (record: any) => {
            if (primaryColumn && record[primaryColumn] !== undefined) {
                const val = record[primaryColumn]
                if (typeof val === 'boolean') return val ? 'True' : 'False'
                return String(val)
            }
            if (record.name) return record.name
            if (record.title) return record.title
            if (record.email) return record.email
            return record.id
        },
        [primaryColumn]
    )

    const displayValue = useMemo(() => {
        if (selectedIds.length === 0) return 'None'
        if (selectedRecordsQuery.isLoading) return 'Loading...'
        if (!selectedRecordsQuery.data || selectedRecordsQuery.data.length === 0) {
            return selectedIds.join(', ')
        }

        const names = selectedRecordsQuery.data.map(getRecordDisplayValue)
        return names.join(', ')
    }, [
        selectedIds,
        selectedRecordsQuery.data,
        selectedRecordsQuery.isLoading,
        getRecordDisplayValue,
    ])

    return (
        <Field backgroundColor={backgroundColor}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                {fieldName}
            </Text>
            <View
                style={{
                    backgroundColor: COLORS.bgLevel2,
                    borderRadius: 5,
                    padding: 10,
                }}
            >
                <Text style={{ color: COLORS.text, fontSize: 16 }}>{displayValue}</Text>
            </View>
        </Field>
    )
}
