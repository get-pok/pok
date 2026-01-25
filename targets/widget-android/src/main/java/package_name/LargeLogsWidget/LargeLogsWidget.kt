package package_name

import android.content.Context
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
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.google.gson.Gson
import androidx.glance.action.clickable
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.Image
import androidx.glance.ImageProvider
import android.content.ComponentName

class LargeLogsWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetGlanceTheme {
                LargeLogsWidgetContent()
            }
        }
    }
}

@Composable
fun LargeLogsWidgetContent() {
    val prefs = currentState<Preferences>()
    val configJson = prefs[stringPreferencesKey("config")]
    val stateJson = prefs[stringPreferencesKey("state")]
    val isSubscribed = prefs[booleanPreferencesKey("isSubscribed")] ?: false
    
    val config = try {
        configJson?.let { Gson().fromJson(it, LogWidgetConfig::class.java) }
    } catch (e: Exception) { null }

    val state = try {
        stateJson?.let { Gson().fromJson(it, LogWidgetState::class.java) }
    } catch (e: Exception) { null }

    val deepLink = if (config != null) {
        getAppDeepLink(context, config.connectionId, "")
    } else {
        "pok://"
    }

    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(deepLink)).apply {
        setComponent(ComponentName("com.pok.mobile", "com.pok.mobile.MainActivity"))
        flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
        contentAlignment = Alignment.TopStart
    ) {
        if (!isSubscribed) {
            SubscriptionRequiredView()
        } else {
            when {
                config == null -> {
                    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Tap to configure", style = TextStyle(color = ColorProvider(Color.White)))
                    }
                }
                state == null || state.state == WidgetIntentState.LOADING -> {
                    LoadingView()
                }
                state.state == WidgetIntentState.API_FAILED -> {
                    ErrorView(state.errorMessage ?: "API Failed")
                }
                state.logs.isEmpty() -> {
                    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No logs found", style = TextStyle(color = ColorProvider(Color.Gray)))
                    }
                }
                else -> {
                    LogsListView(state.serverName, state.logs)
                }
            }
        }
    }
}

@Composable
fun LogsListView(serverName: String, logs: List<PocketBaseLog>) {
    val context = LocalContext.current
    Column(modifier = GlanceModifier.fillMaxSize()) {
        // Header: Logo + Server Name
        Row(
            modifier = GlanceModifier.fillMaxWidth().padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                provider = ImageProvider(
                    context.resources.getIdentifier("ic_launcher", "mipmap", context.packageName)
                ), 
                contentDescription = null,
                modifier = GlanceModifier.size(20.dp)
            )
            Spacer(modifier = GlanceModifier.width(8.dp))
            Text(
                text = serverName,
                maxLines = 1,
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = ColorProvider(Color.White)
                )
            )
        }

        // Logs List
        LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
            items(logs) { log ->
                Column(modifier = GlanceModifier.fillMaxWidth()) {
                    LogItemView(log)
                    // Divider
                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .height(1.dp)
                            .background(Color(0x1AFFFFFF)) // 10% White
                    ) {}
                }
            }
        }
    }
}

@Composable
fun LogItemView(log: PocketBaseLog) {
    val context = LocalContext.current
    
    // Robust extraction helpers
    fun Any?.toSafeInt(): Int? = when (this) {
        is Number -> this.toInt()
        is String -> this.toIntOrNull()
        else -> null
    }

    fun Any?.toSafeDouble(): Double? = when (this) {
        is Number -> this.toDouble()
        is String -> this.toDoubleOrNull()
        else -> null
    }

    // Extract metadata with fallbacks to the 'data' map and alternative keys
    val statusValue = log.status ?: log.data?.get("status").toSafeInt() ?: (if (log.message?.startsWith("200") == true) 200 else null)
    
    // Check multiple possible keys for duration
    val durationValue = log.duration ?: 
        log.data?.get("duration").toSafeDouble() ?: 
        log.data?.get("execTime").toSafeDouble() ?: 
        log.data?.get("exec_time").toSafeDouble() ?:
        log.data?.get("time").toSafeDouble()
        
    val methodValue = log.method ?: (log.data?.get("method") as? String)
    val urlValue = log.url ?: (log.data?.get("url") as? String)
    val levelValue = log.level ?: (log.data?.get("level") as? String) ?: "info"
    
    val isRequest = statusValue != null || methodValue != null || urlValue != null
    
    // Top Row Badge Logic: Always INFO/WARN/ERROR
    val (statusColor, iconResId, labelText) = when {
        isRequest -> {
            val s = statusValue ?: 200
            when {
                s in 200..299 -> Triple(green500, R.drawable.ic_status_success, "INFO")
                s in 400..499 -> Triple(yellow500, R.drawable.ic_status_warning, "WARN")
                else -> Triple(red500, R.drawable.ic_status_error, "ERROR")
            }
        }
        else -> {
            val l = levelValue.lowercase()
            when {
                l.contains("err") || l == "8" -> Triple(red500, R.drawable.ic_status_error, "ERROR")
                l.contains("warn") || l == "4" -> Triple(yellow500, R.drawable.ic_status_warning, "WARN")
                else -> Triple(green500, R.drawable.ic_status_success, "INFO")
            }
        }
    }

    val secondaryText = if (isRequest) {
        val displayUrl = urlValue?.replace("/api/collections", "") ?: ""
        "${methodValue} ${displayUrl}" 
    } else {
        log.message?.replace("/api/collections", "") ?: "Log entry"
    }

    // Parse Timestamp (top right)
    val timeStr = try {
        log.created?.substring(11, 16) ?: "" 
    } catch (e: Exception) { "" }

    Column(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp)) {
        // TOP ROW: Level Badge (Label) + Message/URL + Time (Stamp)
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Level Pill (Always show Label)
            Box(
                modifier = GlanceModifier
                    .background(statusColor)
                    .cornerRadius(12.dp)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
                contentAlignment = Alignment.Center
            ) {
                 Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        provider = ImageProvider(iconResId),
                        contentDescription = null,
                        modifier = GlanceModifier.size(12.dp)
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = labelText,
                        style = TextStyle(
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(Color.White)
                        )
                    )
                 }
            }
            
            Spacer(modifier = GlanceModifier.width(8.dp))

            // Message/URL (Ellipsis)
            Text(
                text = secondaryText,
                maxLines = 1,
                modifier = GlanceModifier.defaultWeight(),
                style = TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Normal,
                    color = ColorProvider(Color.White)
                )
            )

            Spacer(modifier = GlanceModifier.width(8.dp))
            
            // Timestamp (Fixed end)
            if (timeStr.isNotEmpty()) {
                Text(
                    text = timeStr,
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = ColorProvider(Color(0xFFABB5BF))
                    )
                )
            }
        }
        
        // BOTTOM ROW: Status Code (Left) and Duration (Right)
        if (statusValue != null || durationValue != null) {
            Spacer(modifier = GlanceModifier.height(6.dp))
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Numeric Status Pill (Left)
                if (statusValue != null) {
                    Box(
                        modifier = GlanceModifier
                            .background(ColorProvider(Color(0xFF3F4248))) // Slightly lighter gray
                            .cornerRadius(4.dp)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = statusValue.toString(),
                            style = TextStyle(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(Color(0xFFABB5BF))
                            )
                        )
                    }
                    Spacer(modifier = GlanceModifier.width(4.dp))
                }

                // ExecTime Pill (consecutive to status)
                if (durationValue != null) {
                    val it = durationValue
                    // PB durations can be in seconds (e.g. 0.024) or milliseconds (e.g. 24)
                    // If it's > 500, it's almost certainly milliseconds. If it's < 10, it's likely seconds.
                    // But usually PB uses milliseconds or microseconds. 
                    // Let's assume: if >= 10, it reflects MS already. If < 10, it might be S.
                    // Actually, let's keep it simple: if < 1.0, it's seconds, convert to MS.
                    // Wait, if it's 24.0, it's 24MS. If it's 0.024, it's 24MS.
                    val (displayVal, unit) = when {
                        it == 0.0 -> "0" to "MS"
                        it < 1.0 -> "${(it * 1000).toInt()}" to "MS"
                        it < 1000.0 -> "${it.toInt()}" to "MS"
                        else -> "${String.format("%.2f", it / 1000.0)}" to "S"
                    }
                    
                    Box(
                        modifier = GlanceModifier
                            .background(ColorProvider(Color(0xFF3F4248))) // Slightly lighter gray
                            .cornerRadius(4.dp)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "$displayVal$unit",
                            style = TextStyle(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(Color(0xFFABB5BF))
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ErrorView(message: String) {
    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(message, style = TextStyle(color = ColorProvider(red500), textAlign = androidx.glance.text.TextAlign.Center))
    }
}
