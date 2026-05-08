const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH to your local service account JSON file.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node scripts/set-admin-claim.cjs <USER_UID>');
  console.error('Example: FIREBASE_SERVICE_ACCOUNT_PATH=/secure/path/service-account.json node scripts/set-admin-claim.cjs <USER_UID>');
  process.exit(1);
}

async function grantAdmin() {
  try {
    console.log(`Granting admin claim to UID: ${uid}`);
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Success: admin claim granted for UID ${uid}`);
    console.log('Note: the user must refresh their Firebase ID token in the client with getIdToken(true).');
  } catch (error) {
    console.error('Error granting admin claim:', error);
    process.exit(1);
  }
}

grantAdmin();
