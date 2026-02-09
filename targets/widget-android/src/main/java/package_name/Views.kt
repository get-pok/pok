package package_name

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.padding
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceTheme
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color

@Composable
fun SubscriptionRequiredView() {
    Box(
        contentAlignment = Alignment.Center,
        modifier = GlanceModifier.fillMaxSize(),
    ) {
        Text(
            text = "Subscription missing, tap here to enable",
            style = TextStyle(
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = ColorProvider(Color.White),
            ),
        )
    }
}

@Composable
fun LoadingView() {
    Box(
        contentAlignment = Alignment.Center,
        modifier = GlanceModifier.fillMaxSize().padding(16.dp),
    ) {
        Text(
            text = "Loading data...",
            style = TextStyle(
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = GlanceTheme.colors.onSurface,
            ),
        )
    }
}


