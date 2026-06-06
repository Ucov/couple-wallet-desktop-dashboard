import imapSimple from 'imap-simple';
import { simpleParser } from 'mailparser';
import PocketBase from 'pocketbase';
import puppeteer from 'puppeteer';

const pb = new PocketBase('http://192.168.1.11:8090');

const config = {
  imap: {
    user: 'unasev48@gmail.com',
    password: 'firyupkoerijuhym',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

async function syncGmailReceipts() {
  let connection;
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    
    console.log("🔍 [Gmail Sync] Buscando gastos sin ticket en la base de datos...");
    const missingReceipts = await pb.collection('expenses').getFullList({ filter: "status='MISSING_RECEIPT'" });
    
    if (missingReceipts.length === 0) {
      console.log("✅ No hay gastos pendientes de ticket.");
      return;
    }

    console.log(`📧 [Gmail Sync] Conectando a Gmail (unasev48@gmail.com)...`);
    connection = await imapSimple.connect(config);
    await connection.openBox('INBOX');
    console.log("🔓 [Gmail Sync] Conexión IMAP establecida con éxito.");

    // Fecha límite para buscar (últimos 15 días)
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 15);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sinceStr = `${sinceDate.getDate()} ${monthNames[sinceDate.getMonth()]} ${sinceDate.getFullYear()}`;

    for (const exp of missingReceipts) {
      console.log(`\n🔎 [Gmail Sync] Buscando factura para: ${exp.concept} (${exp.amount}€)`);
      
      // Intentamos buscar por el concepto (ej: Netflix)
      const keyword = exp.concept.split(' ')[0].toUpperCase(); 
      const searchCriteria = [['SINCE', sinceStr], ['BODY', keyword]];
      
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`   ✉️ Encontrados ${messages.length} correos coincidentes para ${keyword}.`);

      if (messages.length > 0) {
        // Tomamos el correo más reciente
        const msg = messages[messages.length - 1];
        const all = msg.parts.find(p => p.which === '');
        const id = msg.attributes.uid;
        const idHeader = "Imap-Id: "+id+"\r\n";
        
        const parsed = await simpleParser(idHeader + all.body);
        console.log(`   📎 Asunto del correo detectado: "${parsed.subject}"`);

        let receiptFile;
        if (parsed.attachments && parsed.attachments.length > 0) {
          console.log(`   📄 Adjunto PDF detectado: ${parsed.attachments[0].filename}`);
          receiptFile = new File([parsed.attachments[0].content], parsed.attachments[0].filename, { type: parsed.attachments[0].contentType });
        } else {
          console.log(`   📸 No hay PDF adjunto. Renderizando HTML del correo como Imagen (Puppeteer)...`);
          const htmlContent = parsed.html || `<html><body><pre>${parsed.text}</pre></body></html>`;
          const browser = await puppeteer.launch();
          const page = await browser.newPage();
          await page.setViewport({ width: 800, height: 1200 });
          await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
          const imageBuffer = await page.screenshot({ fullPage: true });
          await browser.close();
          receiptFile = new File([imageBuffer], `${keyword}_Receipt.png`, { type: 'image/png' });
        }

        // Subir a PocketBase
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        formData.append('status', 'VERIFIED');
        
        await pb.collection('expenses').update(exp.id, formData);
        console.log(`   🌟 ¡ÉXITO! Ticket asociado y gasto marcado como VERIFIED.`);
      } else {
         console.log(`   ⚠️ No se ha encontrado ninguna factura en el correo para este gasto.`);
      }
    }
    
  } catch (err) {
    console.error("❌ Error en Gmail Sync:", err);
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

syncGmailReceipts();
