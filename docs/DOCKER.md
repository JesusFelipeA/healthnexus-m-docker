# Docker en la app móvil

La app Android corre en un emulador o celular; en Docker se ejecutan Metro, las pruebas, el lint y la compilación del release.

## Desarrollo
    docker compose up -d metro        # Metro en :8081
    adb reverse tcp:8081 tcp:8081     # en la PC, con el celular/emulador conectado
    npx react-native run-android      # compila e instala (necesita Android Studio en la PC)
    docker compose run --rm test      # Jest
    docker compose run --rm lint      # ESLint
Guarda el proyecto dentro de WSL (no en C:\) para que Metro detecte los cambios.

## Release (AAB firmado)
1. `docker build -f Dockerfile.build -t healthnexus-android-build .`
2. Guarda el `.jks` y un `keystore.properties` FUERA del proyecto. En ese archivo usa `storeFile=/secrets/healthnexus-upload.jks`.
3. Revisa `PROD_URL` en `src/config.js` (HTTPS real).
4. Compila:

        docker run --rm \
          -v "$PWD":/app \
          -v hn_node_modules:/app/node_modules \
          -v hn_gradle_cache:/root/.gradle \
          -v "C:/llaves/healthnexus-upload.jks":/secrets/healthnexus-upload.jks:ro \
          -v "C:/llaves/keystore.properties":/app/android/keystore.properties:ro \
          healthnexus-android-build \
          sh -c "npm ci && npm run release:aab"

El AAB queda en `android/app/build/outputs/bundle/release/`. Sube `hnVersionCode` en `android/gradle.properties` antes de cada publicación.
