import { COLORS } from '@/theme/colors'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function LogsLayout() {
    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerBlurEffect: 'regular',
                headerLargeTitleStyle: {
                    color: COLORS.text,
                },
                headerTintColor: COLORS.text,
                headerStyle: {
                    backgroundColor: COLORS.bgApp,
                },
                contentStyle: {
                    backgroundColor: COLORS.bgApp,
                },
                title: 'Logs',
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    )
}
