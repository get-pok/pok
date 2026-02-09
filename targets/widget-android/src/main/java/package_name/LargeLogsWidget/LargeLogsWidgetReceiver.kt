package package_name

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import com.google.gson.Gson
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class LargeLogsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LargeLogsWidget()

    private val scope = MainScope()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        
        appWidgetIds.forEach { id ->
            scope.launch {
                try {
                    val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(id)
                    updateWidgetData(context, glanceId)
                } catch (e: Exception) {
                    Log.e("LargeLogsWidgetReceiver", "Failed to update widget $id", e)
                }
            }
        }
    }

    /**
     * Called when the configuration activity finishes.
     */
    suspend fun onConfigurationComplete(context: Context, glanceId: GlanceId) {
        updateWidgetData(context, glanceId)
    }

    private suspend fun updateWidgetData(context: Context, glanceId: GlanceId) {
        // 1. Get current config from SharedPreferences
        val appWidgetId = try { GlanceAppWidgetManager(context).getAppWidgetId(glanceId) } catch (e: Exception) { -1 }
        if (appWidgetId == -1) return

        val widgetPrefs = context.getSharedPreferences("widget_$appWidgetId", Context.MODE_PRIVATE)
        val configJson = widgetPrefs.getString("config", null) ?: return
        
        val config = try {
            Gson().fromJson(configJson, LogWidgetConfig::class.java)
        } catch (e: Exception) { null } ?: return

        // 2. Set loading state
        updateState(context, glanceId) { prefs ->
            val currentStateJson = prefs[stringPreferencesKey("state")]
            val currentState = try {
                currentStateJson?.let { Gson().fromJson(it, LogWidgetState::class.java) }
            } catch (e: Exception) { null } ?: LogWidgetState()
            
            val loadingState = currentState.copy(state = WidgetIntentState.LOADING)
            prefs[stringPreferencesKey("config")] = configJson
            prefs[stringPreferencesKey("state")] = Gson().toJson(loadingState)
        }

        // 3. Fetch data
        try {
            val connections: List<Connection> = getAllConnections(context)
            val connection = connections.find { it.id == config.connectionId }
            
            if (connection == null) {
                setError(context, glanceId, "Server not found")
                return
            }

            val logs = fetchPocketBaseLogs(connection, config.includeSuperusers)
            
            // 4. Update state with logs
            updateState(context, glanceId) { prefs ->
                val successState = LogWidgetState(
                    serverName = connection.name ?: connection.url,
                    logs = logs,
                    state = WidgetIntentState.HAS_DATA,
                    lastUpdated = System.currentTimeMillis()
                )
                // We keep IS_SUBSCRIBED check for the UI to handle
                val isSubscribed = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                    .getBoolean(IS_SUBSCRIBED_KEY, false)
                
                prefs[booleanPreferencesKey("isSubscribed")] = isSubscribed
                prefs[stringPreferencesKey("state")] = Gson().toJson(successState)
            }
        } catch (e: Exception) {
            Log.e("LargeLogsWidgetReceiver", "Failed to update widget", e)
            val errorMsg = if (e.message?.contains("401") == true) "Unauthorized" else "Error: ${e.message}"
            setError(context, glanceId, errorMsg)
        }
    }

    private suspend fun setError(context: Context, glanceId: GlanceId, message: String) {
        updateState(context, glanceId) { prefs ->
            val currentStateJson = prefs[stringPreferencesKey("state")]
            val currentState = try {
                currentStateJson?.let { Gson().fromJson(it, LogWidgetState::class.java) }
            } catch (e: Exception) { null } ?: LogWidgetState()
            
            val errorState = currentState.copy(state = WidgetIntentState.API_FAILED, errorMessage = message)
            prefs[stringPreferencesKey("state")] = Gson().toJson(errorState)
        }
    }

    private suspend fun updateState(
        context: Context,
        glanceId: GlanceId,
        update: (MutablePreferences) -> Unit
    ) {
        updateAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId) { prefs ->
            prefs.toMutablePreferences().apply(update)
        }
        glanceAppWidget.update(context, glanceId)
    }
}
