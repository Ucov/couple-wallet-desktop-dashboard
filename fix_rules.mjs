import PocketBase from 'pocketbase';

const pb = new PocketBase('http://192.168.1.11:8090');

async function fix() {
  try {
    await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
    console.log("✅ Admin Auth Success");

    const usersCol = await pb.collections.getOne('users');
    usersCol.listRule = "";
    usersCol.viewRule = "";
    await pb.collections.update('users', usersCol);
    console.log("✅ Users rules updated to PUBLIC");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fix();
