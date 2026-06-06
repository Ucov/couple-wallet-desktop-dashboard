import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function fixSchema() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');

    const updateFields = async (collectionName, fields, listRule, viewRule, createRule, updateRule, deleteRule) => {
      const col = await pb.collections.getOne(collectionName);
      for (const field of fields) {
        if (!col.fields.find(f => f.name === field.name)) {
          col.fields.push(field);
        }
      }
      if (listRule !== undefined) col.listRule = listRule;
      if (viewRule !== undefined) col.viewRule = viewRule;
      if (createRule !== undefined) col.createRule = createRule;
      if (updateRule !== undefined) col.updateRule = updateRule;
      if (deleteRule !== undefined) col.deleteRule = deleteRule;
      await pb.collections.update(collectionName, col);
      console.log(`Updated ${collectionName}`);
    };

    const couplesCol = await pb.collections.getOne('couples');
    await updateFields('couples', [
      { name: 'name', type: 'text', required: true }
    ]);
    
    // Create 'Hogar' couple if missing
    let coupleId = couplesCol.id;
    try {
      const couples = await pb.collection('couples').getFullList();
      if (couples.length > 0) coupleId = couples[0].id;
      else {
        const c = await pb.collection('couples').create({ name: 'Hogar' });
        coupleId = c.id;
      }
    } catch(e) { console.log(e); }

    await updateFields('categories', [
      { name: 'name', type: 'text', required: true },
      { name: 'color', type: 'text' }
    ]);
    
    // Insert categories
    try {
      const cats = await pb.collection('categories').getFullList();
      if (cats.length === 0) {
        await pb.collection('categories').create({ name: 'Alimentación', color: '#10b981' });
        await pb.collection('categories').create({ name: 'Hogar', color: '#3b82f6' });
        await pb.collection('categories').create({ name: 'Ocio', color: '#f59e0b' });
        await pb.collection('categories').create({ name: 'Salud', color: '#ef4444' });
      }
    } catch(e) { console.log(e); }
    
    const categoriesCol = await pb.collections.getOne('categories');

    await updateFields('expenses', [
      { name: 'amount', type: 'number', required: true },
      { name: 'concept', type: 'text', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'category_id', type: 'relation', collectionId: categoriesCol.id, maxSelect: 1 },
      { name: 'paid_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
      { name: 'couple_id', type: 'relation', collectionId: couplesCol.id, maxSelect: 1 },
      { name: 'is_refundable', type: 'bool' },
      { name: 'is_transfer', type: 'bool' }
    ], 
      '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id'
    );

    await updateFields('calendar_events', [
      { name: 'title', type: 'text', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'couple_id', type: 'relation', collectionId: couplesCol.id, maxSelect: 1 },
      { name: 'created_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 }
    ],
      '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id'
    );

    await updateFields('shopping_items', [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'text' },
      { name: 'couple_id', type: 'relation', collectionId: couplesCol.id, maxSelect: 1 },
      { name: 'created_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 }
    ],
      '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id'
    );

    await updateFields('settlements', [
      { name: 'month', type: 'number', required: true },
      { name: 'year', type: 'number', required: true },
      { name: 'couple_id', type: 'relation', collectionId: couplesCol.id, maxSelect: 1 },
      { name: 'settled_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 }
    ],
      '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '@request.auth.couple_id = couple_id', '', ''
    );

    // Give users a couple_id if missing
    const users = await pb.collection('users').getFullList();
    for (const u of users) {
      if (!u.couple_id) {
        await pb.collection('users').update(u.id, { couple_id: coupleId });
      }
    }
    
    // Also users listRule needs to allow viewing other users in the same couple
    const usersCol = await pb.collections.getOne('users');
    usersCol.listRule = '@request.auth.couple_id = couple_id';
    usersCol.viewRule = '@request.auth.couple_id = couple_id';
    await pb.collections.update('users', usersCol);

    console.log("All collections fixed successfully!");
  } catch(e) {
    console.error("Fatal error:", e.response?.data || e);
  }
}

fixSchema();
