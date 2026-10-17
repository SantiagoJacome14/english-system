# English Boarding Pass (programa para Windows)

Programa de escritorio con tu rutina diaria, conversación por voz con Claude, el plan de 11 semanas y tu progreso.

## Instalar
1. Ve a [Releases](https://github.com/SantiagoJacome14/english-system/releases/latest) y descarga **English Boarding Pass Setup.exe**.
2. Ábrelo. Si Windows dice "Windows protegió tu PC", toca **Más información → Ejecutar de todas formas** (el programa no está firmado).
3. Abre el programa desde el escritorio.

## Conectar con Claude (una sola vez)
La conversación usa tu propia clave de la API de Claude (se paga por uso):
1. Crea una cuenta en https://console.anthropic.com, agrega saldo en *Billing* y crea una clave en *API Keys*.
2. En el programa, abre **Ajustes**, pega la clave y elige el modelo: Opus 5.5 (mejor calidad) o Haiku 5.5 (más económico).

## Hablar con tu voz
En la pestaña Conversar, haz clic en la caja de texto y presiona **Windows + H**. Para que entienda inglés, agrega *English (United States)* en Configuración → Hora e idioma → Idioma.

## Para desarrolladores
```
cd desktop
npm install
npm start        # abrir en modo desarrollo
npm run dist     # crear el instalador .exe (en Windows)
```
