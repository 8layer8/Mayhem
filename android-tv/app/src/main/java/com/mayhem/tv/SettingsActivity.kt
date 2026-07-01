package com.mayhem.tv

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val existing = Prefs.getServerUrl(this)
        val fromLauncher = intent?.action == Intent.ACTION_MAIN &&
            (intent?.categories?.contains(Intent.CATEGORY_LEANBACK_LAUNCHER) == true ||
                intent?.categories?.contains(Intent.CATEGORY_LAUNCHER) == true)

        if (!existing.isNullOrBlank() && fromLauncher && savedInstanceState == null) {
            openMain()
            return
        }

        setContentView(R.layout.activity_settings)

        val input = findViewById<EditText>(R.id.serverUrlInput)
        val saveButton = findViewById<Button>(R.id.saveButton)

        existing?.let { input.setText(it) }
        input.requestFocus()

        saveButton.setOnClickListener {
            val raw = input.text.toString().trim()
            if (raw.isEmpty()) {
                Toast.makeText(this, R.string.server_url_hint, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val normalized = if (raw.startsWith("http://") || raw.startsWith("https://")) {
                raw.trimEnd('/')
            } else {
                "https://${raw.trimEnd('/')}"
            }

            Prefs.setServerUrl(this, normalized)
            openMain()
        }
    }

    private fun openMain() {
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
        )
        finish()
    }
}
