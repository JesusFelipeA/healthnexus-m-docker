# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ─── Reglas de HealthNexus ───────────────────────────────────────────────────
# React Native y sus librerías ya incluyen sus propias reglas. Si una compilación release con R8 falla,
# agrega aquí la clase que indique el error o pon hnMinify=false en gradle.properties para descartar a R8.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-dontwarn javax.annotation.**
