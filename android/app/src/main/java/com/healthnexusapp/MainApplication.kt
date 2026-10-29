package com.healthnexusapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    crearCanalDeAlertas()
    loadReactNative(this)
  }

  // Canal "alertas" con importancia alta: las emergencias suenan y aparecen arriba de la pantalla.
  private fun crearCanalDeAlertas() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val canal = NotificationChannel("alertas", "Alertas de HealthNexus", NotificationManager.IMPORTANCE_HIGH)
      canal.description = "Emergencias y pacientes en nivel I"
      getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }
  }
}
