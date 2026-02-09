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
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

class MediumStatsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MediumStatsWidget()
    
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
                    Log.e("MediumStatsWidgetReceiver", "Failed to update widget $id", e)
                }
            }
        }
    }

    private suspend fun updateWidgetData(context: Context, glanceId: GlanceId) {
            // 1. Get current config from SharedPreferences
        val appWidgetId = try { GlanceAppWidgetManager(context).getAppWidgetId(glanceId) } catch (e: Exception) { -1 }
        if (appWidgetId == -1) return

        val widgetPrefs = context.getSharedPreferences("widget_$appWidgetId", Context.MODE_PRIVATE)
        val configJson = widgetPrefs.getString("config", null) ?: return
        
        val config = try {
            Gson().fromJson(configJson, StatsWidgetConfig::class.java)
        } catch (e: Exception) { null } ?: return

        // Get Current State to preserve previous counts
        val prefsKey = stringPreferencesKey("state")

        // 2. Set loading state
        updateState(context, glanceId) { prefs ->
             val currentStateJson = prefs[stringPreferencesKey("state")]
             val currentState = try {
                 currentStateJson?.let { Gson().fromJson(it, StatsWidgetState::class.java) }
             } catch (e: Exception) { null } ?: StatsWidgetState()
             
             
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

            // Fetch counts
            val newStatsRaw = coroutineScope {
                config.selectedCollections.map { collectionId ->
                    async {
                        val count = fetchCollectionCount(connection, collectionId)
                        CollectionStat(id = collectionId, name = collectionId, count = count) 
                    }
                }.awaitAll()
            }
            
             val allCollections = fetchCollections(connection).associateBy { it.id }
             val newStatsWithNames = newStatsRaw.map { stat ->
                 val realName = allCollections[stat.id]?.name ?: stat.id
                 stat.copy(name = realName)
             }

            // 4. Update state with Trend Calculation
            updateState(context, glanceId) { prefs ->
                // READ OLD STATE AGAIN to get previous counts
                val currentStateJson = prefs[stringPreferencesKey("state")]
                val oldState = try {
                    currentStateJson?.let { Gson().fromJson(it, StatsWidgetState::class.java) }
                } catch (e: Exception) { null }
                
                val previousCountsMap = oldState?.stats?.associate { it.id to it.count } ?: emptyMap()

                val finalStats = newStatsWithNames.map { stat ->
                    val prev = previousCountsMap[stat.id]
                    stat.copy(previousCount = prev)
                }

                val successState = StatsWidgetState(
                    serverName = connection.name ?: connection.url,
                    stats = finalStats,
                    state = WidgetIntentState.HAS_DATA,
                    lastUpdated = System.currentTimeMillis()
                )
                 // Subscription Check
                val isSubscribed = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                    .getBoolean(IS_SUBSCRIBED_KEY, false)
                
                prefs[booleanPreferencesKey("isSubscribed")] = isSubscribed
                prefs[stringPreferencesKey("state")] = Gson().toJson(successState)
            }
        } catch (e: Exception) {
            Log.e("MediumStatsWidgetReceiver", "Failed to update widget", e)
            setError(context, glanceId, "Error: ${e.message}")
        }
    }
    
    private suspend fun setError(context: Context, glanceId: GlanceId, message: String) {
        updateState(context, glanceId) { prefs ->
             val currentStateJson = prefs[stringPreferencesKey("state")]
             val currentState = try {
                 currentStateJson?.let { Gson().fromJson(it, StatsWidgetState::class.java) }
             } catch (e: Exception) { null } ?: StatsWidgetState()
             
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
