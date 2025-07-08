import 'expo-router/entry'
import Superwall, { SuperwallOptions } from '@superwall/react-native-superwall'
import * as SplashScreen from 'expo-splash-screen'
import { setBackgroundColorAsync } from 'expo-system-ui'
import { Platform, Text, TextInput } from 'react-native'

Text.defaultProps = Text.defaultProps || {}
Text.defaultProps.allowFontScaling = false

TextInput.defaultProps = TextInput.defaultProps || {}
TextInput.defaultProps.autoCapitalize = 'none'
TextInput.defaultProps.autoComplete = 'off'
TextInput.defaultProps.autoCorrect = false

Superwall.configure({
    apiKey: Platform.select({
        ios: process.env.EXPO_PUBLIC_IOS_SUPERWALL_API_KEY,
        android: process.env.EXPO_PUBLIC_ANDROID_SUPERWALL_API_KEY,
    }),
    options: new SuperwallOptions({
        paywalls: {
            shouldPreload: true,
        },
    }),
})
    .then(
        async () => {
            await Superwall.shared.preloadAllPaywalls()
            console.log('Superwall configured')
        },
        (error) => {
            console.error('Could not configure Superwall', error)
        }
    )
    .catch((error) => {
        console.error('Could not configure Superwall', error)
    })

SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({
    duration: 500,
    fade: true,
})

setBackgroundColorAsync('#12181F') // setting it in app.json does not seem to have an effect
