import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function createSchema() {
  try {
    console.log("Autenticando como superusuario...");
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log("Autenticación exitosa.");

    // 1. Crear colección 'couples'
    console.log("Creando colección 'couples'...");
    try {
      await pb.collections.create({
        name: 'couples',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true }
        ],
        listRule: '@request.auth.couple_id = id',
        viewRule: '@request.auth.couple_id = id',
      });
    } catch(e) { console.log("Ya existe 'couples' o error:", e.response?.data) }

    const couples = await pb.collections.getList(1, 1, { filter: 'name="couples"' });
    const couplesCollection = await pb.collections.getOne('couples');

    // Crear pareja inicial
    console.log("Creando pareja de prueba...");
    let couple;
    try {
      const existingCouples = await pb.collection('couples').getFullList();
      if(existingCouples.length > 0) couple = existingCouples[0];
      else couple = await pb.collection('couples').create({ name: 'Hogar' });
    } catch(e) { console.log("Error creando pareja:", e) }

    // 2. Actualizar colección 'users'
    console.log("Actualizando colección 'users'...");
    try {
      await pb.collections.update('users', {
        schema: [
          { name: 'name', type: 'text' },
          { name: 'avatar', type: 'file', options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'] } },
          { name: 'split_percentage', type: 'number' },
          { name: 'couple_id', type: 'relation', options: { collectionId: couplesCollection.id, cascadeDelete: false, minSelect: null, maxSelect: 1 } }
        ]
      });
    } catch(e) { console.log("Error actualizando users:", JSON.stringify(e.response?.data)) }

    // 3. Crear Usuarios
    console.log("Creando usuarios de prueba...");
    try {
      await pb.collection('users').create({
        email: 'admin@hogar.com',
        emailVisibility: true,
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'Unase',
        split_percentage: 50,
        couple_id: couple.id
      });
      await pb.collection('users').create({
        email: 'pareja@hogar.com',
        emailVisibility: true,
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'Pareja',
        split_percentage: 50,
        couple_id: couple.id
      });
    } catch(e) { console.log("Error creando usuarios:", e.response?.data) }

    // 4. Crear colección 'categories'
    console.log("Creando colección 'categories'...");
    try {
      const catCol = await pb.collections.create({
        name: 'categories',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true },
          { name: 'color', type: 'text' }
        ],
        listRule: '',
        viewRule: '',
      });
      
      const categorias = [
        { name: 'Alimentación', color: '#10b981' },
        { name: 'Hogar', color: '#3b82f6' },
        { name: 'Ocio', color: '#f59e0b' },
        { name: 'Salud', color: '#ef4444' }
      ];
      for(let cat of categorias) {
        await pb.collection('categories').create(cat);
      }
    } catch(e) { console.log("Error en categories:", e.response?.data) }

    const categoriesCollection = await pb.collections.getOne('categories');

    // 5. Crear colección 'expenses'
    console.log("Creando colección 'expenses'...");
    try {
      await pb.collections.create({
        name: 'expenses',
        type: 'base',
        schema: [
          { name: 'amount', type: 'number', required: true },
          { name: 'concept', type: 'text', required: true },
          { name: 'date', type: 'date', required: true },
          { name: 'category_id', type: 'relation', options: { collectionId: categoriesCollection.id, maxSelect: 1 } },
          { name: 'paid_by', type: 'relation', options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
          { name: 'couple_id', type: 'relation', options: { collectionId: couplesCollection.id, maxSelect: 1 } },
          { name: 'is_refundable', type: 'bool' },
          { name: 'is_transfer', type: 'bool' },
        ],
        listRule: '@request.auth.couple_id = couple_id',
        viewRule: '@request.auth.couple_id = couple_id',
        createRule: '@request.auth.couple_id = couple_id',
        updateRule: '@request.auth.couple_id = couple_id',
        deleteRule: '@request.auth.couple_id = couple_id',
      });
    } catch(e) { console.log("Error en expenses:", e.response?.data) }

    // 6. Crear colección 'calendar_events'
    console.log("Creando colección 'calendar_events'...");
    try {
      await pb.collections.create({
        name: 'calendar_events',
        type: 'base',
        schema: [
          { name: 'title', type: 'text', required: true },
          { name: 'date', type: 'date', required: true },
          { name: 'couple_id', type: 'relation', options: { collectionId: couplesCollection.id, maxSelect: 1 } },
          { name: 'created_by', type: 'relation', options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
        ],
        listRule: '@request.auth.couple_id = couple_id',
        viewRule: '@request.auth.couple_id = couple_id',
        createRule: '@request.auth.couple_id = couple_id',
        updateRule: '@request.auth.couple_id = couple_id',
        deleteRule: '@request.auth.couple_id = couple_id',
      });
    } catch(e) { console.log("Error en calendar_events:", e.response?.data) }

    // 7. Crear colección 'shopping_items'
    console.log("Creando colección 'shopping_items'...");
    try {
      await pb.collections.create({
        name: 'shopping_items',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true },
          { name: 'status', type: 'text' }, // pending, bought
          { name: 'couple_id', type: 'relation', options: { collectionId: couplesCollection.id, maxSelect: 1 } },
          { name: 'created_by', type: 'relation', options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
        ],
        listRule: '@request.auth.couple_id = couple_id',
        viewRule: '@request.auth.couple_id = couple_id',
        createRule: '@request.auth.couple_id = couple_id',
        updateRule: '@request.auth.couple_id = couple_id',
        deleteRule: '@request.auth.couple_id = couple_id',
      });
    } catch(e) { console.log("Error en shopping_items:", e.response?.data) }

    // 8. Crear colección 'settlements'
    console.log("Creando colección 'settlements'...");
    try {
      await pb.collections.create({
        name: 'settlements',
        type: 'base',
        schema: [
          { name: 'month', type: 'number', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'couple_id', type: 'relation', options: { collectionId: couplesCollection.id, maxSelect: 1 } },
          { name: 'settled_by', type: 'relation', options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
        ],
        listRule: '@request.auth.couple_id = couple_id',
        viewRule: '@request.auth.couple_id = couple_id',
        createRule: '@request.auth.couple_id = couple_id',
      });
    } catch(e) { console.log("Error en settlements:", e.response?.data) }

    console.log("¡Todo listo! Creado esquema y usuarios.");

  } catch (err) {
    console.error("Error global:", err);
  }
}

createSchema();
