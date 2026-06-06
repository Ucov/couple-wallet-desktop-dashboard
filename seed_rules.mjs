import PocketBase from 'pocketbase';
const pb = new PocketBase('http://192.168.1.11:8090');

async function seedRules() {
  await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
  
  const cats = await pb.collections.getOne('categories');
  const couples = await pb.collections.getOne('couples');

  const categories = await pb.collection('categories').getFullList();
  const alimCat = categories.find(c => c.name.toLowerCase().includes('comida') || c.name.toLowerCase().includes('aliment'));
  const subsCat = categories.find(c => c.name.toLowerCase().includes('suscrip') || c.name.toLowerCase().includes('ocio'));
  
  const myCouple = await pb.collection('couples').getFirstListItem('');

  if (alimCat) {
     await pb.collection('rules').create({
        keyword: 'mercadona',
        category_id: alimCat.id,
        couple_id: myCouple.id
     });
     console.log('Rule mercadona created');
  }

  if (subsCat) {
     await pb.collection('rules').create({
        keyword: 'netflix',
        category_id: subsCat.id,
        couple_id: myCouple.id
     });
     console.log('Rule netflix created');
  }
}
seedRules();
