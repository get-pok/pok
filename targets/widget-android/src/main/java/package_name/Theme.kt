package package_name

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceComposable
import androidx.glance.GlanceTheme
import androidx.glance.material3.ColorProviders
import androidx.glance.unit.ColorProvider

// Shared colors
val green500 = Color(0xFF32AD84)
val red500 = Color(0xFFE34562)
val yellow500 = Color(0xFFFF944D)
val white = Color(0xFFFFFFFF)
val black = Color(0xFF000000)
val neutral200 = Color(0xFFA49B8F)

val bgApp = Color(0xFF181A1B)
val bgDark = Color(0xFF1C1E1F)

// Light colors
private val LightColorPalette = lightColorScheme(
    background = bgApp,
    onSurface = white,
    primary = white,
    secondary = bgDark,
    error = red500,
    outline = yellow500,
)

// Dark colors
private val DarkColorPalette = darkColorScheme(
    background = bgApp,
    onSurface = white,
    primary = white,
    secondary = bgDark,
    error = red500,
    outline = yellow500,
)

private val GlanceColors = ColorProviders(
    light = LightColorPalette,
    dark = DarkColorPalette,
)

private val WidgetTypography = Typography(
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        color = white,
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 20.sp,
        color = white,
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        color = white,
    ),
)

@Composable
fun WidgetMaterialTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColorPalette else LightColorPalette

    MaterialTheme(
        colorScheme = colors,
        typography = WidgetTypography,
        content = content,
    )
}

@Composable
@GlanceComposable
fun WidgetGlanceTheme(
    content: @Composable () -> Unit,
) {
    GlanceTheme(
        colors = GlanceColors,
        content = content,
    )
}


