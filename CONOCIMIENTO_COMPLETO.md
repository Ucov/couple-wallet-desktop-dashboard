# 🧠 ARCHIVO MAESTRO DE CONOCIMIENTO — ProyectoCasa (Desktop Dashboard)

> **ATENCIÓN PARA FUTUROS AGENTES:** Este es el archivo "fuente de verdad" e historial de conocimiento del **Desktop Dashboard** de la aplicación **CoupleWallet**, dentro del ecosistema **ProyectoCasa**. Leed este archivo por completo al iniciar cualquier nueva conversación/sesión para heredar el 100% del contexto histórico, decisiones técnicas y arquitectónicas sin requerir que el usuario os vuelva a explicar el proyecto.

---

## 📌 Contexto del Proyecto

**CoupleWallet Desktop Dashboard** es el panel de control avanzado para pantallas grandes (ordenadores) del gestor de finanzas para parejas. Mientras que la aplicación principal (Next.js) está optimizada para móvil y el día a día (PWA), este dashboard en Vite+React está pensado para análisis en profundidad, proyecciones financieras y automatizaciones pesadas (como la sincronización de extractos bancarios e integración con IA).

---

## 🛠️ Stack Tecnológico y Arquitectura

- **Framework:** Vite + React 19 + TypeScript (Client-side puro)
- **Estilos:** Tailwind CSS 4 + componentes de interfaz Radix UI
- **Base de Datos/Backend:** PocketBase (SQLite) interactuando con la misma instancia que la PWA principal (típicamente `http://192.168.1.11:8090`).
- **Gráficos Avanzados:** `recharts` (Gráficos de barras, líneas y tendencias).
- **Inteligencia Artificial:** `@google/generative-ai` (Gemini) integrado para análisis financiero, categorización automática y proyecciones de gasto.
- **Automatización de Bancos (Scraping/Imap):** 
  - `puppeteer` para extraer y verificar recibos del banco directamente navegando por interfaces web cuando es necesario.
  - `imap-simple` y `mailparser` para leer correos de notificaciones del banco y registrar automáticamente gastos recurrentes.
  - **Macrodroid Webhooks**: Un endpoint de PocketBase (`pb_hooks/macrodroid.pb.js`) diseñado para recibir peticiones HTTP enviadas por Macrodroid desde el móvil del usuario al detectar una notificación bancaria. Extrae automáticamente el importe mediante RegEx, identifica si es gasto o ingreso e implementa control de idempotencia (anti-duplicados por 5 minutos). **Novedad:** Al guardar el gasto, PocketBase dispara automáticamente un Webhook a **n8n** para continuar el flujo de categorización inteligente.

## ⚙️ Automatizaciones Externas con n8n
El ecosistema depende fuertemente de **n8n** (típicamente alojado en `n8n.unai-lab.duckdns.org`) para flujos asíncronos y pesados. Hay 3 flujos principales configurados:
1. **Categorización Mágica:** PocketBase notifica a n8n cuando entra un gasto de Macrodroid. n8n contacta con Gemini, pasándole la lista de IDs de categorías, y devuelve el ID correcto a PocketBase haciendo un PATCH sobre el gasto.
2. **Subida de Tickets (Nextcloud):** La PWA sube las fotos de los tickets mediante un webhook a n8n, el cual guarda la imagen en la carpeta `CoupleWallet/Tickets` de Nextcloud, genera un enlace público y actualiza el registro en PocketBase.
3. **Resumen Financiero (Email):** Un cron job en n8n que todos los domingos a las 10AM consulta el gasto de los últimos 7 días en PocketBase, verifica si supera el umbral (ej. 150€) y envía un correo HTML de alerta mediante SMTP.

### 📂 Estructura de la Base de Código
```text
desktop-dashboard/
├── CONOCIMIENTO_COMPLETO.md   <-- (Este archivo maestro)
├── src/
│   ├── components/            # Componentes UI (Dashboard, Gráficos, Chatbot IA)
│   ├── utils/                 # Utilidades de conexión a PocketBase
│   └── App.tsx                # Aplicación principal
├── pb_hooks/                  # Hooks personalizados de servidor de PocketBase
├── scripts de backend:
│   ├── sync_daemon.mjs        # Demonio en segundo plano
│   ├── gmail_sync.mjs         # Sincronización con correo para gastos automatizados
│   ├── deploy_to_server.py    # Script de despliegue al servidor 
│   └── fix_schema.mjs         # Utilidad para aplicar cambios en PocketBase
└── package.json               # Dependencias (incluye puppeteer y @google/generative-ai)
```

---

## 🤖 Integración de IA (Gemini) y Proyecciones

El Dashboard destaca por su motor de análisis. Utiliza Gemini para:
1. **Analizar tendencias:** Leer el historial de gastos (`expenses`) desde PocketBase y detectar patrones (ej: "Estáis gastando un 15% más en Ocio este mes").
2. **Proyección (Forecasting):** Proyectar a final de mes cómo quedará el balance basándose en los gastos recurrentes automatizados y el gasto diario.
3. **Categorización Inteligente:** Al sincronizar correos del banco o descargar extractos, usa la IA para decidir automáticamente si el gasto va a "Supermercado", "Hogar", etc.

---

## ⚠️ Instrucciones Globales (Directrices del Usuario)
- **Gestor de Paquetes:** Utilizar SIEMPRE `pnpm` en lugar de `npm`. No preguntar al usuario, asumir `pnpm` para instalaciones y ejecución de scripts.
- Si hay errores con scripts de `puppeteer` en la instalación, se usa `pnpm install --ignore-scripts`.
- Este proyecto **comparte** la misma base de datos PocketBase que la PWA. Los cambios en el esquema de la DB en uno, afectan al otro. (Colecciones `users`, `couples`, `expenses`, `categories`, etc).
- Para arrancar el entorno de desarrollo: `pnpm dev`. Corre típicamente en el puerto **5173**.

*Este documento ha sido generado automáticamente por Antigravity para preservar el conocimiento histórico del proyecto de escritorio.*
