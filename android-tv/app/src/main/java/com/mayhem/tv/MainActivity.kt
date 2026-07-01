package com.mayhem.tv

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private var webView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val serverUrl = Prefs.getServerUrl(this)
        if (serverUrl.isNullOrBlank()) {
            startActivity(Intent(this, SettingsActivity::class.java))
            finish()
            return
        }

        if (!isWebViewAvailable()) {
            Toast.makeText(this, R.string.webview_missing, Toast.LENGTH_LONG).show()
            startActivity(Intent(this, SettingsActivity::class.java))
            finish()
            return
        }

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)

        webView = WebView(this).apply {
            setBackgroundColor(0xFF0B0B0F.toInt())
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                userAgentString = settings.userAgentString + " MayhemAndroidTV/1.0"
            }

            cookieManager.setAcceptThirdPartyCookies(this, true)

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String?) {
                    cookieManager.flush()
                    view.evaluateJavascript(
                        "document.documentElement.dataset.mayhemTv='true';document.documentElement.dataset.tv='true';",
                        null,
                    )
                }

                @Deprecated("Deprecated in API 23")
                override fun onReceivedError(
                    view: WebView,
                    errorCode: Int,
                    description: String?,
                    failingUrl: String?,
                ) {
                    Toast.makeText(this@MainActivity, R.string.load_error, Toast.LENGTH_LONG).show()
                }
            }

            cookieManager.flush()
            loadUrl(serverUrl)
        }

        setContentView(webView)
    }

    private fun isWebViewAvailable(): Boolean {
        return try {
            WebView(this).destroy()
            true
        } catch (_: Exception) {
            false
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        val view = webView ?: return super.onKeyDown(keyCode, event)

        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (view.canGoBack()) {
                    view.goBack()
                    return true
                }
            }
            KeyEvent.KEYCODE_MENU -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
            KeyEvent.KEYCODE_MEDIA_PLAY,
            KeyEvent.KEYCODE_MEDIA_PAUSE,
            KeyEvent.KEYCODE_MEDIA_NEXT,
            KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                view.requestFocus()
                return view.dispatchKeyEvent(event) || super.onKeyDown(keyCode, event)
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
        webView?.requestFocus(View.FOCUS_DOWN)
        CookieManager.getInstance().flush()
    }

    override fun onPause() {
        webView?.onPause()
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
