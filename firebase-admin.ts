import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = getFirestore(firebaseConfig.firestoreDatabaseId);
export const auth = admin.auth();

export default admin;
