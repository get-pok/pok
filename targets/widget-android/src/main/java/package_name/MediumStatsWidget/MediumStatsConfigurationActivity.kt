package package_name

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
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
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import kotlinx.coroutines.launch
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack

class MediumStatsConfigurationActivity : ComponentActivity() {

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
            val connections = remember { getAllConnections(this) }
            var currentStep by remember { mutableStateOf(StatsConfigStep.SELECT_CONNECTION) }
            var selectedConnection by remember { mutableStateOf<Connection?>(null) }
            var availableCollections by remember { mutableStateOf<List<CollectionModel>>(emptyList()) }
            var selectedCollectionIds by remember { mutableStateOf<Set<String>>(emptySet()) }
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
                        // Title & Subtitle (Matching BaseWidgetConfigurationActivity)
                        Text(
                            text = if (currentStep == StatsConfigStep.SELECT_CONNECTION) "Configure Collection Stats" else "Select Tables",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = if (currentStep == StatsConfigStep.SELECT_CONNECTION) 
                                "Select a server to fetch collections from." 
                            else 
                                "Choose the collections you want to display on the widget.",
                            fontSize = 14.sp,
                            color = Color(0xFFE6ECF2)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Content
                        when (currentStep) {
                            StatsConfigStep.SELECT_CONNECTION -> {
                                if (connections.isEmpty()) {
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = "No connections found",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = "Please add a server in the app first",
                                                color = Color(0xFFABB5BF),
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                } else {
                                    Text(
                                        text = "Select Server:",
                                        fontSize = 14.sp,
                                        color = Color(0xFFABB5BF)
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))

                                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(connections) { connection ->
                                            ConnectionListItemView(connection) {
                                                selectedConnection = connection
                                                isLoadingCollections = true
                                                currentStep = StatsConfigStep.SELECT_COLLECTIONS
                                                scope.launch {
                                                    try {
                                                        availableCollections = fetchCollections(connection)
                                                    } catch (e: Exception) {
                                                        // Handle error
                                                    } finally {
                                                        isLoadingCollections = false
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            StatsConfigStep.SELECT_COLLECTIONS -> {
                                if (isLoadingCollections) {
                                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(color = Color.White)
                                    }
                                } else if (availableCollections.isEmpty()) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                        Text("No collections found.", color = Color.Red)
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Button(
                                            onClick = { currentStep = StatsConfigStep.SELECT_CONNECTION },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF))
                                        ) {
                                            Text("Back", color = Color.White)
                                        }
                                    }
                                } else {
                                    Column(modifier = Modifier.weight(1f)) {
                                    LazyColumn(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(0.dp) // Reduced spacing
                                    ) {
                                        items(availableCollections) { collection ->
                                            Column {
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable(
                                                            interactionSource = remember { MutableInteractionSource() },
                                                            indication = null
                                                        ) {
                                                            selectedCollectionIds = if (selectedCollectionIds.contains(collection.id)) {
                                                                selectedCollectionIds - collection.id
                                                            } else {
                                                                selectedCollectionIds + collection.id
                                                            }
                                                        }
                                                        .padding(vertical = 8.dp), // Slightly tighter padding
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Checkbox(
                                                        checked = selectedCollectionIds.contains(collection.id),
                                                        onCheckedChange = { checked ->
                                                            selectedCollectionIds = if (checked) {
                                                                selectedCollectionIds + collection.id
                                                            } else {
                                                                selectedCollectionIds - collection.id
                                                            }
                                                        },
                                                        colors = CheckboxDefaults.colors(
                                                            checkedColor = Color(0xFF4CAF50), // Green
                                                            uncheckedColor = Color.Gray,
                                                            checkmarkColor = Color.White
                                                        )
                                                    )
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Text(
                                                        text = collection.name, 
                                                        color = Color.White,
                                                        fontSize = 16.sp
                                                    )
                                                }
                                                // Divider removed or kept? User said remove divider in WIDGET.
                                                Divider(color = Color(0xFF2B2D31), thickness = 1.dp)
                                            }
                                        }
                                    }
                                    
                                    Spacer(modifier = Modifier.height(8.dp))

                                    // Bottom Buttons
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        // Back Button (Goes back to Server Selection)
                                        Row(
                                            modifier = Modifier
                                                .clickable(
                                                    interactionSource = remember { MutableInteractionSource() },
                                                    indication = null
                                                ) { 
                                                    currentStep = StatsConfigStep.SELECT_CONNECTION 
                                                }
                                                .padding(vertical = 12.dp, horizontal = 4.dp), // Added padding for touch target
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.ArrowBack,
                                                contentDescription = "Back",
                                                tint = Color(0xFF4CAF50), // Green
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Back", 
                                                color = Color(0xFF4CAF50), 
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            ) // Green
                                        }

                                        // Save Widget Button
                                        Button(
                                            onClick = {
                                                selectedConnection?.let {
                                                    saveConfiguration(it, selectedCollectionIds.toList())
                                                }
                                            },
                                            enabled = selectedCollectionIds.isNotEmpty(),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFF4CAF50), // Green
                                                disabledContainerColor = Color(0xFF4CAF50).copy(alpha = 0.5f)
                                            )
                                        ) {
                                            Text("Save Widget", color = Color.White, fontWeight = FontWeight.Bold)
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
    }

    private fun saveConfiguration(connection: Connection, collectionIds: List<String>) {
        val widgetPrefs = getSharedPreferences("widget_$appWidgetId", Context.MODE_PRIVATE)
        val config = StatsWidgetConfig(
            connectionId = connection.id,
            selectedCollections = collectionIds
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

enum class StatsConfigStep {
    SELECT_CONNECTION,
    SELECT_COLLECTIONS
}
