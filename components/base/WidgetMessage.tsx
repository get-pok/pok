import WidgetKitModule from '@/modules/widgetkit'
import { COLORS } from '@/theme/colors'
import * as Sentry from '@sentry/react-native'
import { usePlacement, useUser } from 'expo-superwall'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import type { ViewStyle } from 'react-native'

export default function WidgetMessage({ message, style }: { message: string; style?: ViewStyle }) {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()

    if (subscriptionStatus.status !== 'INACTIVE') {
        return null
    }

    return (
        <View style={style}>
            <TouchableOpacity
                style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: COLORS.info,
                }}
                onPress={() => {
                    registerPlacement({
                        placement: 'TapWidget',
                        feature: () => {
                            WidgetKitModule.setIsSubscribed(true)
                            Alert.alert(
                                'Congrats!',
                                'You can now go to your homescreen and search for "POK" widgets'
                            )
                        },
                    }).catch((error) => {
                        Sentry.captureException(error)
                        console.error('Error registering TapWidget', error)
                        Alert.alert('Error', 'Something went wrong, please try again.')
                    })
                }}
            >
                <Text
                    style={{
                        color: COLORS.white,
                        fontSize: 14,
                        fontWeight: 500,
                    }}
                >
                    {message}
                </Text>
            </TouchableOpacity>
        </View>
    )
}
