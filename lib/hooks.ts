import { useFocusEffect, useGlobalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { useCallback } from 'react'
import { Platform } from 'react-native'

export function useSearchParams<T extends Record<string, string>>() {
    //! `useLocalSearchParams` only works on the initial render (when going to /home)
    //! so we have to update this manually using GlobalSearchParams
    //! if we use GlobalSearchParams directly, it will clear the params mid way through the navigation
    //! (when going from vector/home to vector/records or from records to [recordId] to another page for example, it shows the loading state while the navigation is still happening
    //! or worse, it removes the param making it undefined until you navigate back, making the screen load every time you go back)
    const globalSearchParams = useGlobalSearchParams<T>()

    const [_searchParams, _setSearchParams] = useState<T>({} as unknown as T)

    useFocusEffect(
        useCallback(() => {
            if (globalSearchParams === undefined) return
            // console.log('useSearchParams [mount]', globalSearchParams)
            _setSearchParams(globalSearchParams)
        }, [globalSearchParams])
    )

    return _searchParams
}

export function useFlashlistProps(placeholder?: React.ReactNode) {
    const isAndroid = useMemo(() => Platform.OS === 'android', [])

    if (isAndroid) {
        return {
            overrideProps: undefined,
        }
    }

    return {
        overrideProps: placeholder
            ? {
                  contentContainerStyle: {
                      flex: 1,
                  },
              }
            : undefined,
    }
}
