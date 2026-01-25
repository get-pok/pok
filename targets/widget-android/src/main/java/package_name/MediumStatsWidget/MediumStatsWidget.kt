package package_name

import android.content.Context
import android.content.Intent
import android.content.ComponentName
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.Image
import androidx.glance.ImageProvider
import com.google.gson.Gson
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

class MediumStatsWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetGlanceTheme {
                MediumStatsWidgetContent()
            }
        }
    }
    
    // Explicitly update data when the widget updates
    suspend fun updateData(context: Context, glanceId: GlanceId) {
       // logic is handled inside Content via SideEffect or just by re-composition if we force update?
       // Actually Glance doesn't standardly have "LaunchedEffect" to fetch data inside provideContent easily.
       // Usually we fetch data in a Worker or the Receiver's onUpdate, then update state.
       // But for simplicity in this project (like LargeLogsWidget), we might have fetched in the Receiver?
       // Wait, LargeLogsWidgetReceiver used 'updateWidgetData'. I need to replicate that pattern here or make this widget self-updating.
       // I'll check LargeLogsWidgetReceiver again. It calls 'stateDefinition.update { ... }'
    }
}

// NOTE: We need a Receiver logic similar to LargeLogsWidgetReceiver to fetch data!
// The 'MediumStatsWidgetReceiver' I just wrote is empty. I should have put the data fetching logic there!
// I'll update the Receiver in the next step. For now, let's define the UI here.

@Composable
fun MediumStatsWidgetContent() {
    val prefs = currentState<Preferences>()
    val configJson = prefs[stringPreferencesKey("config")]
    val stateJson = prefs[stringPreferencesKey("state")]
    val isSubscribed = prefs[booleanPreferencesKey("isSubscribed")] ?: false

    val config = try {
        configJson?.let { Gson().fromJson(it, StatsWidgetConfig::class.java) }
    } catch (e: Exception) { null }

    val state = try {
        stateJson?.let { Gson().fromJson(it, StatsWidgetState::class.java) }
    } catch (e: Exception) { null }
    
    // Deep Link Logic
    val deepLink = if (config != null) {
        getAppDeepLink(context, config.connectionId, "")
    } else {
        "pok://"
    }

    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(deepLink)).apply {
        setComponent(ComponentName("com.pok.mobile", "com.pok.mobile.MainActivity"))
        flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.background)
            .cornerRadius(12.dp)
            .clickable(onClick = actionStartActivity(intent)),
        contentAlignment = Alignment.TopStart
    ) {
        if (!isSubscribed) {
            SubscriptionRequiredView() // Assuming this exists in Views.kt
        } else {
             when {
                config == null -> {
                     Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Tap to configure", style = TextStyle(color = ColorProvider(Color.White)))
                    }
                }
                state == null || state.state == WidgetIntentState.LOADING -> {
                     Column(modifier = GlanceModifier.padding(16.dp)) {
                        Header(state?.serverName ?: "Loading")
                        Spacer(modifier = GlanceModifier.height(8.dp))
                        Text("Loading...", style = TextStyle(color = ColorProvider(Color.Gray)))
                     }
                }
                 else -> {
                     StatsListView(state.serverName, state.stats, state.lastUpdated)
                 }
             }
        }
    }
}

@Composable
fun Header(serverName: String) {
    val context = LocalContext.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(
            provider = ImageProvider(
                context.resources.getIdentifier("ic_launcher", "mipmap", context.packageName)
            ), 
            contentDescription = null,
            modifier = GlanceModifier.size(16.dp)
        )
        Spacer(modifier = GlanceModifier.width(8.dp))
        Text(
            text = serverName,
            style = TextStyle(
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(Color.White)
            ),
            maxLines = 1
        )

    }
}

@Composable
fun StatsListView(serverName: String, stats: List<CollectionStat>, lastUpdated: Long) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp) 
    ) {
        Header(serverName)
        Spacer(modifier = GlanceModifier.height(12.dp))
        
        // Titles Row
        Row(
            modifier = GlanceModifier.fillMaxWidth().padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Tables",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFABB5BF)),
                    fontSize = 13.sp, // Increased to 13sp
                    fontWeight = FontWeight.Bold
                ),
                modifier = GlanceModifier.defaultWeight()
            )
            Text(
                text = "Count",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFABB5BF)),
                    fontSize = 13.sp, // Increased to 13sp
                    fontWeight = FontWeight.Bold
                )
            )
        }

        LazyColumn(modifier = GlanceModifier.defaultWeight()) {
            items(stats) { stat ->
                Row(
                    modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stat.name,
                        modifier = GlanceModifier.defaultWeight(),
                        style = TextStyle(
                            color = ColorProvider(Color.White), 
                            fontSize = 15.sp // Increased to 15sp
                        ),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.width(8.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = stat.count.toString(),
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF4CAF50)), 
                                fontSize = 15.sp, // Increased to 15sp
                                fontWeight = FontWeight.Bold
                            )
                        )
                        
                        // Trend Indicator
                        if (stat.previousCount != null && stat.count != stat.previousCount) {
                            Spacer(modifier = GlanceModifier.width(4.dp))
                            val isUp = stat.count > stat.previousCount
                            Text(
                                text = if (isUp) "↑" else "↓",
                                style = TextStyle(
                                    color = ColorProvider(if (isUp) Color(0xFF4CAF50) else Color(0xFFFF5252)), // Green or Red
                                    fontSize = 15.sp, // Increased to 15sp
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }
        }
        
        // Footer: Last Updated
        if (lastUpdated > 0) {
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = "Updated: ${java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date(lastUpdated))}",
                style = TextStyle(
                    color = ColorProvider(Color(0xFF555555)),
                    fontSize = 10.sp
                ),
                modifier = GlanceModifier.fillMaxWidth()
            )
        }
    }
}
