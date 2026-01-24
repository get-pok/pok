package package_name

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.foundation.interaction.MutableInteractionSource

class SmallShortcutConfigurationActivity : ComponentActivity() {

    private var appWidgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        setContent {
            // State
            val connections = remember { getAllConnections(this) }
            var currentStep by remember { mutableStateOf(ShortcutConfigStep.SELECT_CONNECTION) }
            var selectedConnection by remember { mutableStateOf<Connection?>(null) }
            var availableCollections by remember { mutableStateOf<List<CollectionModel>>(emptyList()) }
            var isLoadingCollections by remember { mutableStateOf(false) }
            val scope = rememberCoroutineScope()

            WidgetMaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .windowInsetsPadding(WindowInsets.systemBars)
                            .padding(16.dp)
                    ) {
                        // Title
                        Text(
                            text = if (currentStep == ShortcutConfigStep.SELECT_CONNECTION) "Select Server" else "Select Table",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = if (currentStep == ShortcutConfigStep.SELECT_CONNECTION) 
                                "Select a server for the shortcut." 
                            else 
                                "Choose a table to open.",
                            fontSize = 14.sp,
                            color = Color(0xFFE6ECF2)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Content
                        when (currentStep) {
                            ShortcutConfigStep.SELECT_CONNECTION -> {
                                if (connections.isEmpty()) {
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("No connections found", color = Color.White)
                                    }
                                } else {
                                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(connections) { connection ->
                                            ConnectionListItemView(connection) {
                                                selectedConnection = connection
                                                isLoadingCollections = true
                                                currentStep = ShortcutConfigStep.SELECT_COLLECTION
                                                scope.launch {
                                                    try {
                                                        availableCollections = fetchCollections(connection)
                                                    } finally {
                                                        isLoadingCollections = false
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            ShortcutConfigStep.SELECT_COLLECTION -> {
                                if (isLoadingCollections) {
                                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(color = Color.White)
                                    }
                                } else {
                                    Column(modifier = Modifier.weight(1f)) {
                                        LazyColumn(
                                            modifier = Modifier.weight(1f),
                                            verticalArrangement = Arrangement.spacedBy(0.dp)
                                        ) {
                                            items(availableCollections) { collection ->
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable(
                                                            interactionSource = remember { MutableInteractionSource() },
                                                            indication = null
                                                        ) {
                                                            // Save immediately on selection
                                                            selectedConnection?.let {
                                                                saveConfiguration(it, collection)
                                                            }
                                                        }
                                                        .padding(vertical = 12.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = collection.name, 
                                                        color = Color.White,
                                                        fontSize = 16.sp
                                                    )
                                                }
                                                Divider(color = Color(0xFF2B2D31), thickness = 1.dp)
                                            }
                                        }
                                        
                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Back Button
                                        Row(
                                            modifier = Modifier
                                                .clickable(
                                                    interactionSource = remember { MutableInteractionSource() },
                                                    indication = null
                                                ) { 
                                                    currentStep = ShortcutConfigStep.SELECT_CONNECTION 
                                                }
                                                .padding(vertical = 12.dp, horizontal = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.ArrowBack,
                                                contentDescription = "Back",
                                                tint = Color(0xFF4CAF50),
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Back", 
                                                color = Color(0xFF4CAF50), 
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun saveConfiguration(connection: Connection, collection: CollectionModel) {
        val widgetPrefs = getSharedPreferences("widget_$appWidgetId", Context.MODE_PRIVATE)
        val config = ShortcutWidgetConfig(
            connectionId = connection.id,
            collectionId = collection.id,
            collectionName = collection.name
        )

        widgetPrefs.edit().apply {
            putString("config", Gson().toJson(config))
            apply()
        }

        val resultValue = Intent().apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        setResult(RESULT_OK, resultValue)

        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
        }
        sendBroadcast(intent)
        finish()
    }
}

enum class ShortcutConfigStep {
    SELECT_CONNECTION,
    SELECT_COLLECTION
}
