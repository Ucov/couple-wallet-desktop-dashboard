routerAdd("POST", "/api/webhook/macrodroid", (c) => {
    // 1. SEGURIDAD (Cero Accesos Públicos)
    const SECRET_TOKEN = "Bearer CoupleWallet2026";
    const authHeader = c.request().header.get("Authorization");
    
    if (authHeader !== SECRET_TOKEN) {
        return c.json(401, { "error": "Acceso denegado: Token inválido o ausente." });
    }

    // 2. PARSEO DE DATOS
    const data = $apis.requestInfo(c).data;
    const text = data.text || "";
    const title = data.title || "Pago móvil";

    if (!text) {
        return c.json(400, { "error": "Falta el texto de la notificación." });
    }

    // A. Extracción del importe (RegEx)
    let amount = 0;
    // Captura números con o sin decimales (coma o punto) seguidos del símbolo del euro o dólar, o la palabra "de X euros"
    const amountMatch = text.match(/([\d,.]+)\s*[€$]/) || text.match(/(?:de|por)\s+([\d,.]+)/i);
    
    if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    if (amount <= 0) {
        // Retornamos 200 OK para que MacroDroid no registre fallos. No es un pago, es un simple aviso.
        return c.json(200, { "message": "Ignorado: No se detectó importe válido." });
    }

    // B. Identificación del concepto (RegEx)
    let concept = title;
    const conceptMatch = text.match(/en\s+(.+?)(?:\.|$)/i) || text.match(/de\s+([A-Za-z0-9 ]+)(?:\.|$)/i);
    if (conceptMatch && conceptMatch[1].length < 35) {
        concept = conceptMatch[1].trim();
    }

    // C. Ingreso vs Gasto
    let type = "EXPENSE";
    const lowerText = text.toLowerCase();
    
    const isIncome = lowerText.includes("ingreso") || 
                     lowerText.includes("recibido") || 
                     lowerText.includes("a favor") ||
                     lowerText.includes("abono") ||
                     lowerText.includes("devolución");
                     
    if (isIncome) {
        type = "INCOME";
    }

    // 3. CONTROL DE DUPLICADOS (Idempotencia en 5 minutos)
    const windowMinutes = 5;
    // PocketBase JavaScript usa tiempo local, restamos los minutos:
    const timeAgo = new Date(Date.now() - windowMinutes * 60000);
    const formattedDate = timeAgo.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

    try {
        const records = $app.dao().findRecordsByFilter(
            "expenses", 
            "amount = {:amount} && concept = {:concept} && created >= {:date}", 
            null, 
            0,
            {
                "amount": amount,
                "concept": concept,
                "date": formattedDate
            }
        );

        if (records && records.length > 0) {
            console.log("Ignorado: Duplicado detectado para " + concept);
            return c.json(200, { "message": "Ignorado: Gasto ya registrado hace menos de 5 minutos." });
        }
    } catch (err) {
        console.log("Nota: Busqueda de duplicados falló (posiblemente primera ejecución): " + err);
    }

    // 4. INSERCIÓN EN BASE DE DATOS
    const collection = $app.dao().findCollectionByNameOrId("expenses");
    const record = new Record(collection);

    record.set("amount", amount);
    record.set("concept", concept);
    record.set("date", new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z');
    record.set("status", "MISSING_RECEIPT");
    
    // IMPORTANTE: Debes crear un campo 'type' (texto) en tu colección de PocketBase
    record.set("type", type);
    
    $app.dao().saveRecord(record);
    console.log(`✅ Nuevo registro: ${type} de ${amount}€ en ${concept}`);

    // Disparar Webhook a n8n para categorización mágica
    try {
        const n8nUrl = "https://n8n.unai-lab.duckdns.org/webhook/categorize-expense";
        const payload = JSON.stringify({
            "id": record.id,
            "concept": concept,
            "amount": amount,
            "type": type
        });
        $http.send({
            url: n8nUrl,
            method: "POST",
            body: payload,
            headers: { "Content-Type": "application/json" },
            timeout: 5
        });
        console.log(`🚀 Webhook enviado a n8n para categorizar el gasto ${record.id}`);
    } catch (err) {
        console.log(`⚠️ Error enviando webhook a n8n: ${err}`);
    }

    return c.json(200, { 
        "success": true, 
        "message": "Guardado correctamente.", 
        "amount": amount,
        "type": type 
    });
});
