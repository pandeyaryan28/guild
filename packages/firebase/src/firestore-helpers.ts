import { getDocs, writeBatch, type Query, type DocumentData, type CollectionReference } from 'firebase/firestore';
import { db } from './firebase';

export async function deleteCollectionByQuery(q: Query<DocumentData> | CollectionReference<DocumentData> | any): Promise<void> {
  const snap = await getDocs(q);
  if (snap.empty) return;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 200) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 200);
    chunk.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }
}
