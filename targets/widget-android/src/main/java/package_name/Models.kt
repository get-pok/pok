package package_name

import com.google.gson.annotations.SerializedName

// App group configuration / shared keys
const val APP_GROUP_NAME = "group.com.pok.mobile"
const val CONNECTIONS_KEY = "pok::connections"
const val IS_SUBSCRIBED_KEY = "pok::subscribed"
const val WIDGET_STATE_KEY = "pok::widgetState"

// Connection model used for re-authentication on the native side
data class Connection(
    val id: String,
    val name: String? = null,
    val url: String,
    val email: String,
    val password: String
)

// PocketBase Log Entry
// PocketBase Log Entry (Generic)
data class PocketBaseLog(
    val id: String?,
    val created: String?,
    val level: String?,
    val message: String?,
    
    // Request specific (may be mapped from data or top level)
    val url: String?, 
    val method: String?,
    val status: Int?,
    val auth: String?,
    
    @SerializedName("remoteIp")
    val remoteIp: String?,
    @SerializedName("userAgent")
    val userAgent: String?,
    val referer: String?,
    val duration: Double?,
    
    // Fallback for nested data if structure varies
    val data: Map<String, Any>?
)

// Widget configuration for a specific server instance
data class LogWidgetConfig(
    val connectionId: String,
    val includeSuperusers: Boolean = true,
    val refreshIntervalMs: Long = 900000 // 15 minutes default
)

// Represent the high-level state of the widget
enum class WidgetIntentState(val value: Int) {
    LOADING(0),
    API_FAILED(1),
    HAS_DATA(2),
    NO_DATA(3),
    UNAUTHORIZED(4)
}

// Data wrapper for the widget's internal state
data class LogWidgetState(
    val serverName: String = "",
    val logs: List<PocketBaseLog> = emptyList(),
    val state: WidgetIntentState = WidgetIntentState.LOADING,
    val lastUpdated: Long = 0,
    val errorMessage: String? = null
)

// Configuration for the Small Shortcut Widget
data class ShortcutWidgetConfig(
    val connectionId: String,
    val collectionId: String,
    val collectionName: String
)

// Basic PocketBase Collection Model
data class CollectionModel(
    val id: String,
    val name: String,
    val type: String
)

// Config for Medium Stats Widget
data class StatsWidgetConfig(
    val connectionId: String,
    val selectedCollections: List<String> // List of Collection IDs or Names
)

data class CollectionStat(
    val id: String,
    val name: String,
    val count: Int,
    val previousCount: Int? = null
)

data class StatsWidgetState(
    val serverName: String = "",
    val stats: List<CollectionStat> = emptyList(),
    val state: WidgetIntentState = WidgetIntentState.LOADING,
    val lastUpdated: Long = 0,
    val errorMessage: String? = null
)
