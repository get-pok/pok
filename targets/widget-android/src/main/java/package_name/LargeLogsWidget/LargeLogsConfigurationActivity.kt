package package_name

import android.os.Bundle

class LargeLogsConfigurationActivity : BaseWidgetConfigurationActivity() {
    override val widgetClass = LargeLogsWidget::class.java
    override val widgetTitle = "Server Logs"
    override val widgetDescription = "Monitor real-time logs from your PocketBase instance."

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // BaseWidgetConfigurationActivity handles the rest
    }
}
