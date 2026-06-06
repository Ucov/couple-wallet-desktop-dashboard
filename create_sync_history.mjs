import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function createSyncHistory() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    
    try {
      await pb.collections.getOne('sync_history');
      console.log('Collection sync_history already exists.');
    } catch (e) {
      if (e.status === 404) {
        await pb.collections.create({
          name: 'sync_history',
          type: 'base',
          fields: [
            {
              name: 'transaction_id',
              type: 'text',
              required: true
            }
          ]
        });
        console.log('Collection sync_history created successfully.');
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

createSyncHistory();
