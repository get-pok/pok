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

abstract class BaseWidgetConfigurationActivity : ComponentActivity() {

    protected abstract val widgetClass: Class<*>
    protected abstract val widgetTitle: String
    protected abstract val widgetDescription: String

    private var appWidgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(RESULT_CANCELED)

        appWidgetId =
            intent?.extras?.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID,
            )
                ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        setContent {
            val connections = remember { getAllConnections(this) }
            var includeSuperusers by remember { mutableStateOf(true) }
            
            WidgetMaterialTheme {
                WidgetConfigurationScreen(
                    widgetTitle = widgetTitle,
                    widgetDescription = widgetDescription,
                    connections = connections,
                    includeSuperusers = includeSuperusers,
                    onIncludeSuperusersChange = { includeSuperusers = it },
                    onConnectionSelected = { connection -> configureWidget(connection, includeSuperusers) }
                )
            }
        }
    }

    private fun configureWidget(connection: Connection, includeSuperusers: Boolean) {
        val widgetPrefs = getSharedPreferences("widget_$appWidgetId", Context.MODE_PRIVATE)
        
        val config = LogWidgetConfig(
            connectionId = connection.id,
            includeSuperusers = includeSuperusers
        )
        
        widgetPrefs.edit().apply {
            putString("config", Gson().toJson(config))
            apply()
        }

        val resultValue =
            Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
        setResult(RESULT_OK, resultValue)

        val intent =
            Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
            }
        sendBroadcast(intent)

        finish()
    }
}

@Composable
fun WidgetConfigurationScreen(
    widgetTitle: String,
    widgetDescription: String,
    connections: List<Connection> = emptyList(),
    includeSuperusers: Boolean = true,
    onIncludeSuperusersChange: (Boolean) -> Unit = {},
    onConnectionSelected: (Connection) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .windowInsetsPadding(WindowInsets.systemBars) // Safe Area View support
                    .padding(16.dp),
        ) {
            Text(
                text = "Configure $widgetTitle",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = widgetDescription,
                fontSize = 14.sp,
                color = Color(0xFFE6ECF2),
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Superuser Toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Include requests by superusers",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Switch(
                    checked = includeSuperusers,
                    onCheckedChange = onIncludeSuperusersChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF4CAF50),
                        uncheckedThumbColor = Color.Gray,
                        uncheckedTrackColor = Color(0xFF2B2D31)
                    )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (connections.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "No connections found",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Please add a server in the app first",
                            color = Color(0xFFABB5BF),
                            fontSize = 12.sp,
                        )
                    }
                }
            } else {
                Text(
                    text = "Select Server:",
                    fontSize = 14.sp,
                    color = Color(0xFFABB5BF),
                )

                Spacer(modifier = Modifier.height(16.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(connections) { connection ->
                        ConnectionListItemView(
                            connection = connection,
                            onClick = { onConnectionSelected(connection) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ConnectionListItemView(
    connection: Connection,
    onClick: () -> Unit,
) {
    Surface(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onClick
                ),
        color = Color(0xFF161521),
        shape = MaterialTheme.shapes.medium,
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = connection.name ?: connection.url,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = connection.url,
                    fontSize = 12.sp,
                    color = Color(0xFFABB5BF),
                )
            }
        }
    }
}
