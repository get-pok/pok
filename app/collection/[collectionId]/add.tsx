import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import Text from '@/components/base/Text'
import getClient from '@/lib/pb'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Checkbox from 'expo-checkbox'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { router, useLocalSearchParams } from 'expo-router'
import { useNavigation } from 'expo-router'
import type React from 'react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, TextInput, View } from 'react-native'

// const log = (...args: any[]) => {
//     console.log('[AddRecordScreen] ', ...args)
// }

export default function AddRecordScreen() {
    const { collectionId } = useLocalSearchParams<{
        collectionId: string
    }>()
    const navigation = useNavigation()
    const queryClient = useQueryClient()

    const [newRecord, setNewRecord] = useState<Record<string, string | null | boolean>>({})

    const collectionQuery = useQuery({
        queryKey: ['collection', collectionId],
        queryFn: async () => {
            const pb = await getClient()
            const collections = await pb.collections.getFullList()
            return collections.find((collection) => collection.id === collectionId)
        },
    })

    const createRecordMutation = useMutation({
        mutationFn: async () => {
            const pb = await getClient()
            const createdRecord = await pb
                .collection(collectionId)
                .create(newRecord)
                .catch((error) => {
                    if (error?.response?.data) {
                        throw new Error(JSON.stringify(error.response.data, null, 2))
                    }
                    throw new Error(JSON.stringify(error, null, 2))
                })
            return createdRecord.id
        },
        onSuccess: (newRecordId) => {
            queryClient.invalidateQueries({ queryKey: ['collection', collectionId, 'list'] })
            router.back()
            router.push(`/collection/${collectionId}/${newRecordId}`)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const isLoading = useMemo(() => {
        return createRecordMutation.isPending
    }, [createRecordMutation.isPending])

    const hasData = useMemo(() => {
        return Object.keys(newRecord).some((key) => {
            const value = newRecord[key]
            return value !== null && value !== '' && value !== undefined
        })
    }, [newRecord])

    const Placeholder = useMemo(() => {
        const placeholder = buildPlaceholder({
            isLoading: collectionQuery.isLoading,
            isError: collectionQuery.isError,
            hasData: !!collectionQuery.data,
            emptyLabel: 'Collection not found',
            errorLabel: 'Error fetching collection',
        })

        return placeholder
    }, [collectionQuery.isLoading, collectionQuery.isError, collectionQuery.data])

    useLayoutEffect(() => {
        navigation.setOptions({
            title: 'Add Record',
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
                : hasData
                  ? () => (
                        <HeaderTouchableOpacity
                            onPress={() => {
                                createRecordMutation.mutate()
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
                  : undefined,
        })
    }, [navigation, hasData, isLoading, createRecordMutation.mutate])

    // pleasing compiler
    if (Placeholder || !collectionQuery.data) {
        return Placeholder
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 140 }}
        >
            {collectionQuery.data?.fields.map((field, fieldIndex) => {
                // Skip system fields
                if (field.name === 'id' || field.name === 'created' || field.name === 'updated') {
                    return null
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
                            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
                                File uploads are not supported in this view yet
                            </Text>
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
                                                value={newRecord[field.name] === option}
                                                onValueChange={(value) => {
                                                    setNewRecord((prev) => ({
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
                                    value={
                                        typeof newRecord[field.name] === 'boolean'
                                            ? (newRecord[field.name] as boolean)
                                            : false
                                    }
                                    onValueChange={(value) => {
                                        setNewRecord((prev) => ({
                                            ...prev,
                                            [field.name]: value,
                                        }))
                                    }}
                                />

                                <Text style={{ color: COLORS.text, fontSize: 16 }}>
                                    {newRecord[field.name] ? 'True' : 'False'}
                                </Text>
                            </View>
                        </Field>
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
                            }}
                            editable={true}
                            value={newRecord[field.name] as string}
                            onChangeText={(text) => {
                                setNewRecord((prev) => ({
                                    ...prev,
                                    [field.name]: text,
                                }))
                            }}
                            placeholder="Enter value"
                            placeholderTextColor={COLORS.textMuted}
                            multiline={false}
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
