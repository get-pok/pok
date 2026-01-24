package package_name

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs



/**
 * Format large numbers in a compact way (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
fun formatCompactCount(value: Int): String {
    val absValue = abs(value)
    val sign = if (value < 0) "-" else ""

    val formatter = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 0
        maximumFractionDigits = 1
        isGroupingUsed = false
    }

    val (scaled, suffix) =
        when {
            absValue >= 1_000_000_000 -> Pair(absValue / 1_000_000_000.0, "B")
            absValue >= 1_000_000 -> Pair(absValue / 1_000_000.0, "M")
            absValue >= 1_000 -> Pair(absValue / 1_000.0, "K")
            else -> return value.toString()
        }

    val numberString = formatter.format(scaled)
    return "$sign$numberString$suffix"
}

/**
 * Generate deep link to the app
 */
fun getAppDeepLink(context: Context, serverId: String?): String {
    if (serverId == null) {
        return "pok://"
    }
    
    val prefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
    val isSubscribed = prefs.getBoolean(IS_SUBSCRIBED_KEY, false)
    
    if (isSubscribed) {
        return "pok://collections?serverId=$serverId"
    }
    
    return "pok://?showPaywall=1"
}

/**
 * Calculate timestamp from hours ago
 */
fun getTimestampHoursAgo(hours: Int): Long {
    return System.currentTimeMillis() - (hours * 60 * 60 * 1000L)
}

/**
 * ActionCallback to handle deep link clicks from widgets
 */
class OpenDeepLinkAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val serverId = parameters[ServerIdKey]
        val deepLink = getAppDeepLink(context, serverId)
        Log.d("OpenDeepLinkAction", "Opening deep link: $deepLink")
        
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            Log.d("OpenDeepLinkAction", "Successfully launched activity")
        } catch (e: Exception) {
            Log.e("OpenDeepLinkAction", "Error launching activity: ${e.message}", e)
        }
    }

    companion object {
        val ServerIdKey = ActionParameters.Key<String>("serverId")
    }
}

/**
 * Retrieve all connections from the shared storage used by the app.
 */
fun getAllConnections(context: Context): List<Connection> {
    try {
        val sharedPrefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
        val connectionsJson = sharedPrefs.getString(CONNECTIONS_KEY, null) ?: return emptyList()
        
        val type = object : com.google.gson.reflect.TypeToken<List<Connection>>() {}.type
        return com.google.gson.Gson().fromJson(connectionsJson, type)
    } catch (e: Exception) {
        Log.e("Helpers", "Failed to load connections from SharedPrefs", e)
        return emptyList()
    }
}


