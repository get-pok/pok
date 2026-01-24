package package_name

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.size
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.currentState
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.action.actionParametersOf
import com.google.gson.Gson
import package_name.OpenDeepLinkAction
import package_name.ShortcutWidgetConfig

class SmallShortcutWidget : GlanceAppWidget() {
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetGlanceTheme {
                SmallShortcutContent()
            }
        }
    }
}

@Composable
fun SmallShortcutContent() {
    val prefs = currentState<Preferences>()
    val configJson = prefs[stringPreferencesKey("config")]
    val isSubscribed = prefs[booleanPreferencesKey("isSubscribed")] ?: false
    
    val config = try {
        configJson?.let { Gson().fromJson(it, ShortcutWidgetConfig::class.java) }
    } catch (e: Exception) { null }
    
    val context = LocalContext.current
    
    // Deep Link Logic
    // pok://collection/<collectionId>?serverId=<serverId>
    val deepLink = if (config != null) {
        "pok://collection/${config.collectionId}?serverId=${config.connectionId}"
    } else {
        "pok://"
    }

    val deepLinkUri = Uri.parse(deepLink)
    val intent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
        component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.background)
            .padding(16.dp)
            .clickable(onClick = androidx.glance.appwidget.action.actionStartActivity(intent)),
        contentAlignment = Alignment.Center
    ) {
        if (!isSubscribed) {
            SubscriptionRequiredView()
        } else {
             if (config != null) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = GlanceModifier.fillMaxSize()
                ) {
                    Spacer(modifier = GlanceModifier.defaultWeight())
                    
                    // App Icon (Logo)
                    Image(
                        provider = ImageProvider(
                             context.resources.getIdentifier("ic_launcher", "mipmap", context.packageName)
                        ),
                        contentDescription = "App Icon",
                        modifier = GlanceModifier.size(40.dp)
                    )
                    
                    Spacer(modifier = GlanceModifier.height(8.dp))
                    
                    // Collection Name
                    Text(
                        text = config.collectionName,
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = GlanceTheme.colors.onSurface,
                            textAlign = TextAlign.Center
                        ),
                        maxLines = 2
                    )
                    
                    Spacer(modifier = GlanceModifier.defaultWeight())
                }
            } else {
                // Placeholder / "Tap to Configure" state if needed, 
                // but usually handled by showing configuration activity on launch if separate.
                // Or just show placeholder.
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Tap to setup",
                         style = TextStyle(color = androidx.glance.unit.ColorProvider(android.graphics.Color.GRAY))
                    )
                }
            }
        }
    }
}
