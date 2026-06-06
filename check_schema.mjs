import PocketBase from 'pocketbase';
const pb = new PocketBase('http://192.168.1.11:8090');

async function check() {
  await pb.admins.authWithPassword('unasev48@gmail.com', 'uVVcOMgRKfr1Rbj2');
  const subs = await pb.collections.getOne('subscriptions');
  console.log(JSON.stringify(subs.fields, null, 2));
}
check();
