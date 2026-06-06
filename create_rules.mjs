import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function createCollection() {
  try {
    // Log in as superuser
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log('Logged in successfully');

    const categoriesCollection = await pb.collections.getOne('categories');
    const couplesCollection = await pb.collections.getOne('couples');

    const collectionData = {
      "name": "rules",
      "type": "base",
      "fields": [
        {
          "name": "keyword",
          "type": "text",
          "required": true
        },
        {
          "name": "category_id",
          "type": "relation",
          "required": true,
          "collectionId": categoriesCollection.id,
          "maxSelect": 1
        },
        {
          "name": "couple_id",
          "type": "relation",
          "required": true,
          "collectionId": couplesCollection.id,
          "maxSelect": 1
        }
      ],
      "listRule": "couple_id = @request.auth.couple_id",
      "viewRule": "couple_id = @request.auth.couple_id",
      "createRule": "couple_id = @request.auth.couple_id",
      "updateRule": "couple_id = @request.auth.couple_id",
      "deleteRule": "couple_id = @request.auth.couple_id",
    };

    try {
      const existing = await pb.collections.getOne('rules');
      console.log('Rules collection already exists!', existing.id);
      await pb.collections.update(existing.id, collectionData);
      console.log('Updated existing collection');
    } catch(err) {
      if (err.status === 404) {
        const record = await pb.collections.create(collectionData);
        console.log('Rules collection created successfully!', record.id);
      } else {
        throw err;
      }
    }

  } catch (err) {
    console.error('Error:', err.data || err.message);
  }
}

createCollection();
