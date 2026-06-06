import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function updateCollection() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log('Logged in successfully');

    const expensesCollection = await pb.collections.getOne('expenses');
    
    const existingFields = expensesCollection.fields || expensesCollection.schema;
    
    const fieldsToAdd = [
      {
        "name": "bank_transaction_id",
        "type": "text",
        "required": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "name": "status",
        "type": "text",
        "required": false
      },
      {
        "name": "source",
        "type": "text",
        "required": false
      }
    ];

    let modified = false;
    for (const newField of fieldsToAdd) {
      const exists = existingFields.find(f => f.name === newField.name);
      if (!exists) {
        existingFields.push(newField);
        modified = true;
      }
    }

    if (modified) {
      if (expensesCollection.fields) {
        expensesCollection.fields = existingFields;
      } else {
        expensesCollection.schema = existingFields;
      }
      await pb.collections.update(expensesCollection.id, expensesCollection);
      console.log('Expenses collection updated with Sprint 4 fields successfully!');
    } else {
      console.log('Fields already exist.');
    }

  } catch (err) {
    console.error('Error:', err.data || err.message);
  }
}

updateCollection();
