import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { type OnboardingFeature, OnboardingView } from 'expo-onboarding'
import { router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'

const FEATURES: OnboardingFeature[] = [
    {
        title: 'Manage Pocketbase',
        description:
            'See logs, browse collections, and check on your databases everywhere you are.',
        systemImage: 'server.rack',
    },
    {
        title: 'Open Source',
        description:
            'You are using Open Source Software (OSS) crafted by SQLite-loving people. Give it a star!',
        systemImage: 'star.fill',
        links: [
            {
                sectionText: 'Give it a star!',
                sectionUrl: 'https://github.com/getpok/pok',
            },
        ],
    },
    {
        title: 'Local Only',
        description:
            'Your data never leaves the app, this includes your API token which is locally stored.',
        systemImage: 'shield.fill',
    },
]

export default function OnboardScreen() {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: 'black',
                paddingTop: 100,
            }}
        >
            <OnboardingView
                features={FEATURES}
                icon={require('@/assets/icon.png')}
                appName="Pok"
                tintColor={COLORS.info}
                titleStyle={{}}
                featureTitleStyle={{
                    color: COLORS.text,
                }}
                featureDescriptionStyle={{
                    color: COLORS.textMuted,
                }}
                ButtonComponent={() => (
                    <TouchableOpacity
                        style={{
                            width: '100%',
                            maxWidth: '80%',
                            backgroundColor: COLORS.info,
                            padding: 10,
                            borderRadius: 12.5,
                        }}
                        onPress={() => {
                            usePersistedStore.setState({ hasSeenOnboarding: true })
                            router.dismissTo('/')
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.text,
                                textAlign: 'center',
                                fontSize: 20,
                                fontWeight: 600,
                                paddingTop: 4,
                                paddingBottom: 6,
                            }}
                        >
                            Let's go
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    )
}
