import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

// Simula la llamada a la API de GoCardless (Nordigen)
async function getMockBankTransactions() {
  console.log("🏦 [Bank API] Conectando con la API del banco (Simulación)...");
  await new Promise(r => setTimeout(r, 1000)); // Simulate network latency

  const mockTxns = [];
  
  // Para hacer la demo impresionante, vamos a buscar si tienes gastos PENDING_BANK 
  // y simularemos que el banco los ha liquidado hoy con un nombre feo de banco.
  const allExp = await pb.collection('expenses').getFullList();
  const pendingManual = allExp.filter(e => e.status === 'PENDING_BANK').sort((a,b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  if (pendingManual.length > 0) {
    const expToMatch = pendingManual[0];
    const txnDate = new Date(expToMatch.date);
    txnDate.setDate(txnDate.getDate() + 1); // El banco lo liquida 1 día después

    mockTxns.push({
      id: `txn_mock_${expToMatch.id}`,
      amount: expToMatch.amount,
      concept: `COMPRA TPV * ${expToMatch.concept.toUpperCase()}`,
      date: txnDate.toISOString()
    });
    console.log(`🏦 [Bank API] Generada transacción simulada para hacer MATCH con: ${expToMatch.concept}`);
  }

  // Y añadimos una transacción huérfana (suscripción) de la que no tienes ticket
  mockTxns.push({
    id: `txn_netflix_monthly_test_2`,
    amount: 15.99,
    concept: "NETFLIX S.L.",
    date: new Date().toISOString()
  });

  // Simulamos un gasto de Riot Games para el que SI tenemos un recibo en el correo
  mockTxns.push({
    id: `txn_riot_games_test_2`,
    amount: 5.00, // Ajustado a 5 dólares/euros
    concept: "RIOT GAMES",
    date: new Date().toISOString()
  });

  return mockTxns;
}

async function runReconciliationEngine() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log("🤖 [Daemon] Iniciando motor de conciliación...");

    const bankTransactions = await getMockBankTransactions();
    
    const allExpenses = await pb.collection('expenses').getFullList();
    const pendingExpenses = allExpenses.filter(e => e.status === 'PENDING_BANK');
    const syncHistory = await pb.collection('sync_history').getFullList();
    
    const users = await pb.collection('users').getFullList();
    const defaultUser = users[0];

    for (const txn of bankTransactions) {
      // ¿Ya fue procesada antes y borrada/ignorada?
      if (syncHistory.some(h => h.transaction_id === txn.id)) {
        console.log(`\n⏭️  Saltando cargo ignorado/ya procesado: ${txn.concept} (${txn.id})`);
        continue;
      }

      console.log(`\n🔍 Analizando cargo bancario: ${txn.concept} (-${txn.amount}€)`);
      
      // Buscar Match (Mismo importe exacto y fecha +/- 3 días)
      const txnDate = new Date(txn.date);
      let matchedExpense = null;

      for (const exp of pendingExpenses) {
        if (exp.amount === txn.amount) {
          const expDate = new Date(exp.date);
          const diffTime = Math.abs(txnDate - expDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays <= 3) {
            matchedExpense = exp;
            break;
          }
        }
      }

      if (matchedExpense) {
        // MATCH ENCONTRADO! Fusionamos y actualizamos a VERIFIED
        console.log(`   ✅ MATCH ENCONTRADO con gasto manual: ${matchedExpense.concept}`);
        await pb.collection('expenses').update(matchedExpense.id, {
          status: 'VERIFIED',
          bank_transaction_id: txn.id
        });
        console.log(`   🌟 Gasto manual actualizado a VERIFIED.`);
        
        await pb.collection('sync_history').create({ transaction_id: txn.id });
        
        // Lo sacamos de la lista para que no haga match dos veces
        const index = pendingExpenses.indexOf(matchedExpense);
        if (index > -1) pendingExpenses.splice(index, 1);
        
      } else {
        // NO HAY MATCH. Es un gasto del que no tenemos ticket.
        console.log(`   ⚠️ NO HAY MATCH. Creando gasto huérfano (MISSING_RECEIPT).`);
        
        // Pasarlo por las Smart Rules para adivinar la categoría
        const rules = await pb.collection('rules').getFullList();
        let categoryId = null;
        for (const rule of rules) {
          if (txn.concept.toLowerCase().includes(rule.keyword.toLowerCase())) {
            categoryId = rule.category_id;
            break;
          }
        }
        
        if (!categoryId) {
           const cats = await pb.collection('categories').getFullList();
           if (txn.concept.toLowerCase().includes('riot') || txn.concept.toLowerCase().includes('netflix')) {
             const ocioCat = cats.find(c => c.name === 'Ocio');
             if (ocioCat) categoryId = ocioCat.id;
           } else {
             if (cats.length > 0) categoryId = cats[0].id;
           }
        }

        await pb.collection('expenses').create({
          concept: txn.concept,
          amount: txn.amount,
          date: txn.date,
          status: 'MISSING_RECEIPT',
          source: 'BANK_SYNC',
          bank_transaction_id: txn.id,
          paid_by: defaultUser.id,
          couple_id: defaultUser.couple_id,
          category_id: categoryId
        });
        await pb.collection('sync_history').create({ transaction_id: txn.id });
        console.log(`   📥 Gasto guardado esperando ticket.`);
      }
    }
    
    console.log("\n✅ [Daemon] Conciliación finalizada.");

  } catch (error) {
    console.error("Error en el daemon:", error);
  }
}

runReconciliationEngine();
