import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/sync', (req, res) => {
  console.log('🔄 Sincronización manual solicitada desde UI');
  
  // Ejecutar el banco
  const bankSync = spawn('node', ['sync_daemon.mjs'], { stdio: 'inherit' });
  
  bankSync.on('close', (code) => {
    // Ejecutar el correo
    const emailSync = spawn('node', ['gmail_sync.mjs'], { stdio: 'inherit' });
    emailSync.on('close', () => {
       res.json({ success: true, message: 'Sincronización completada' });
    });
  });
});

app.post('/api/webhook/wallet', async (req, res) => {
  console.log('📱 Recibido Webhook de Android:', req.body);
  const { title, text } = req.body;
  // Ejemplo de texto: "Has pagado 15,99 € en Netflix"
  
  try {
    // Extraer importe
    const amountMatch = text.match(/([\d,.]+)\s*[€$]/);
    let amount = 0;
    if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // Extraer concepto (lo que va después de "en " o usar el título)
    let concept = title || "Pago con móvil";
    const conceptMatch = text.match(/en\s+(.+?)(?:\.|$)/i);
    if (conceptMatch) {
        concept = conceptMatch[1].trim();
    }

    if (amount > 0) {
        const PocketBase = (await import('pocketbase')).default;
        const pb = new PocketBase('http://192.168.1.11:8090');
        await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
        
        // Lo creamos como MISSING_RECEIPT para que el daemon busque el email luego
        await pb.collection('expenses').create({
            amount: amount,
            concept: concept,
            date: new Date().toISOString(),
            status: 'MISSING_RECEIPT',
            // Puedes asignar un couple_id o paid_by default si es necesario
        });
        
        console.log(`✅ Pago interceptado y guardado: ${amount}€ en ${concept}`);
        // Arrancamos el sabueso de correos automáticamente 1 minuto después
        setTimeout(() => {
            spawn('node', ['gmail_sync.mjs'], { stdio: 'inherit' });
        }, 60000);

        return res.json({ success: true, message: 'Gasto guardado en PocketBase' });
    } else {
        return res.status(400).json({ error: 'No se pudo detectar el importe en el texto' });
    }
  } catch (error) {
    console.error('❌ Error guardando webhook:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Sincronización corriendo en http://localhost:${PORT}`);
});
