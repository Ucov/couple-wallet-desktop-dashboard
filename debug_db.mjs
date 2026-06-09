import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function debugRules() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log("✅ Admin Auth Success");

    const collections = ['expenses', 'calendar_events', 'shopping_items', 'budgets'];
    for (const name of collections) {
      try {
        const col = await pb.collections.getOne(name);
        console.log(`\n--- ${name} ---`);
        console.log("Create Rule:", col.createRule);
        console.log("Update Rule:", col.updateRule);
        console.log("Delete Rule:", col.deleteRule);
      } catch (e) {
        console.log(`Collection ${name} not found or error:`, e.message);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugRules();
