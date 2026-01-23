import buildPlaceholder from '@/components/base/Placeholder'
import Text from '@/components/base/Text'
import WidgetMessage from '@/components/base/WidgetMessage'
import { LEVEL_COLORS, LEVEL_LABELS } from '@/lib/constants'
import getClient from '@/lib/pb'
import { COLORS } from '@/theme/colors'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, TextInput, View } from 'react-native'

// Helper function to check if a value is empty
const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    if (typeof value === 'object' && Object.keys(value).length === 0) return true
    return false
}

export default function LogScreen() {
    const { logId } = useLocalSearchParams<{ logId: string }>()

    const logQuery = useQuery({
        queryKey: ['logs', logId],
        queryFn: async () => {
            const pb = await getClient()
            const log = await pb.logs.getOne(logId)
            return log
        },
    })

    const log = useMemo(() => logQuery.data, [logQuery.data])

    // Create a structured view of all log fields
    const logFields = useMemo(() => {
        if (!log) return { mainFields: [], dataFields: [] }

        const mainFields: Array<{ key: string; value: any }> = []
        const dataFields: Array<{ key: string; value: any }> = []

        // Define the order of main fields to display first
        const mainFieldOrder = ['id', 'level', 'created', 'message']

        // Add main fields in specified order
        for (const fieldKey of mainFieldOrder) {
            if (log[fieldKey] !== undefined && !isEmpty(log[fieldKey])) {
                mainFields.push({
                    key: fieldKey,
                    value: log[fieldKey],
                })
            }
        }

        // Add any other top-level fields that aren't in the main order
        for (const [key, value] of Object.entries(log)) {
            if (key === 'data') {
                // Handle nested data object
                if (typeof value === 'object' && value !== null) {
                    for (const [nestedKey, nestedValue] of Object.entries(value)) {
                        if (!isEmpty(nestedValue)) {
                            dataFields.push({
                                key: `data.${nestedKey}`,
                                value: nestedValue,
                            })
                        }
                    }
                }
            } else if (!mainFieldOrder.includes(key) && !isEmpty(value)) {
                // Add other top-level fields that aren't in mainFieldOrder
                mainFields.push({
                    key,
                    value,
                })
            }
        }

        return { mainFields, dataFields }
    }, [log])

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value, null, 2)
        return String(value)
    }

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: logQuery.isLoading,
            isError: logQuery.isError,
            hasData: !!log,
            emptyLabel: 'Log not found',
            errorLabel: 'Error fetching log',
        })
    }, [logQuery.isLoading, logQuery.isError, log])

    if (Placeholder) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {Placeholder}
            </View>
        )
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            <WidgetMessage
                message="Check logs with a widget on your homescreen!"
                style={{ padding: 20, paddingBottom: 16, paddingTop: 8 }}
            />
            {logFields.mainFields.map((field, fieldIndex) => {
                const fieldValue = formatValue(field.value)
                const displayName = field.key

                return (
                    <View
                        key={`${field.key}`}
                        style={{
                            flexDirection: 'column',
                            gap: 10,
                            padding: 20,
                            paddingTop: 12,
                            paddingBottom: 16,
                            backgroundColor: fieldIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                        }}
                    >
                        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                            {displayName}
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: COLORS.bgLevel2,
                                borderRadius: 5,
                                padding: 10,
                                color:
                                    field.key === 'level'
                                        ? LEVEL_COLORS[field.value as keyof typeof LEVEL_COLORS]
                                        : COLORS.text,
                                fontSize: 16,
                                minHeight: fieldValue?.length > 100 ? 250 : undefined,
                            }}
                            editable={false}
                            value={
                                field.key === 'level'
                                    ? `${LEVEL_LABELS[
                                          field.value as keyof typeof LEVEL_LABELS
                                      ].toUpperCase()} (${field.value})`
                                    : fieldValue
                            }
                            placeholder="No value"
                            multiline={fieldValue?.length > 100}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                    </View>
                )
            })}
            {logFields.dataFields.map((field, fieldIndex) => {
                const fieldValue = formatValue(field.value)
                const displayName = field.key
                const totalIndex = logFields.mainFields.length + fieldIndex

                return (
                    <View
                        key={`${field.key}`}
                        style={{
                            flexDirection: 'column',
                            gap: 10,
                            padding: 20,
                            paddingTop: 12,
                            paddingBottom: 16,
                            backgroundColor: totalIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                        }}
                    >
                        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>
                            {displayName}
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: COLORS.bgLevel2,
                                borderRadius: 5,
                                padding: 10,
                                color: field.key === 'data.error' ? COLORS.danger : COLORS.text,
                                fontSize: 16,
                                minHeight: fieldValue?.length > 100 ? 250 : undefined,
                            }}
                            editable={false}
                            value={fieldValue}
                            multiline={fieldValue?.length > 100}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                    </View>
                )
            })}
        </ScrollView>
    )
}
