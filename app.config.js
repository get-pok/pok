//  https://docs.expo.dev/workflow/configuration/#switching-configuration-based-on-the-environment
//  https://docs.expo.dev/versions/latest/config/app/#backgroundcolor
//  https://docs.expo.dev/versions/latest/config/app/#primarycolor

module.exports = ({ config }) => {
    return {
        ...config,
        primaryColor: '#000000',
        backgroundColor: '#000000',

        name: process.env.EXPO_PUBLIC_APP_NAME,
        slug: process.env.EXPO_PUBLIC_APP_SLUG,
        scheme: process.env.EXPO_PUBLIC_APP_SCHEME,
        version: process.env.EXPO_PUBLIC_APP_VERSION,
        owner: process.env.EXPO_PUBLIC_OWNER,

        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        newArchEnabled: true,

        ios: {
            ...(config.ios || {}),
            appleTeamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
            bundleIdentifier: process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER,
            supportsTablet: true,
            config: {
                usesNonExemptEncryption: false,
            },
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true,
                },
                SKIncludeConsumableInAppPurchaseHistory: true,
            },
            entitlements: {
                'com.apple.security.application-groups': [process.env.EXPO_PUBLIC_WIDGET_GROUP],
            },
        },

        androidNavigationBar: {
            enforceContrast: false,
        },
        android: {
            ...(config.android || {}),
            package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE,
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#0A0A0A',
            },
            // googleServicesFile: './google-services.json',
            playStoreUrl: process.env.EXPO_PUBLIC_ANDROID_STORE_URL,
            predictiveBackGestureEnabled: false,
        },

        plugins: [
            [
                'expo-build-properties',
                {
                    ios: {
                        networkInspector: false,
                    },
                    android: {
                        usesCleartextTraffic: true,
                        minSdkVersion: 24,
                        targetSdkVersion: 35,
                    },
                },
            ],
            './plugins/withAndroidHeap',
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/icon.png',
                    resizeMode: 'contain',
                    backgroundColor: '#181A1B',
                    imageWidth: 200,
                },
            ],
            'expo-quick-actions',
            [
                '@sentry/react-native/expo',
                {
                    url: 'https://sentry.io/',
                    project: process.env.EXPO_PUBLIC_SENTRY_PROJECT,
                    organization: process.env.EXPO_PUBLIC_SENTRY_ORG,
                },
            ],
            'expo-font',
            'expo-web-browser',
            [
                'expo-alternate-app-icons',
                [
                    {
                        name: 'DatabaseDark',
                        ios: './assets/icon-db-dark.png',
                        android: {
                            foregroundImage: './assets/icon-db-dark.png',
                        },
                    },
                    {
                        name: 'DatabaseLight',
                        ios: './assets/icon-db-light.png',
                        android: {
                            foregroundImage: './assets/icon-db-light.png',
                        },
                    },
                    {
                        name: 'Gopher',
                        ios: './assets/icon-gopher.png',
                        android: {
                            foregroundImage: './assets/icon-gopher.png',
                        },
                    },
                ],
            ],
            '@bacons/apple-targets',
        ],

        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {
                origin: false,
            },
            eas: {
                projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
            },
        },
    }
}
