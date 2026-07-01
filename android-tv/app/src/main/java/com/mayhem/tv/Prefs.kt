package com.mayhem.tv

import android.content.Context
import android.content.SharedPreferences

object Prefs {
    private const val NAME = "mayhem_tv"
    private const val KEY_SERVER_URL = "server_url"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun getServerUrl(context: Context): String? =
        prefs(context).getString(KEY_SERVER_URL, null)?.trim()?.ifEmpty { null }

    fun setServerUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_SERVER_URL, url.trim()).apply()
    }
}
