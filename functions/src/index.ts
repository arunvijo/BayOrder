import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Deletes all documents in a collection in batches.
 */
async function deleteCollectionBatch(
  query: admin.firestore.Query,
  batchSize: number,
): Promise<number> {
  const snapshot = await query.limit(batchSize).get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.size;
}

/**
 * Deletes all documents matching a query.
 */
async function deleteQuery(query: admin.firestore.Query): Promise<number> {
  const batchSize = 100;
  let deletedCount = 0;
  let processed = 0;

  do {
    processed = await deleteCollectionBatch(query, batchSize);
    deletedCount += processed;
  } while (processed === batchSize);

  return deletedCount;
}

/**
 * Callable function to purge old data for a specific cafe.
 */
export const purgeOldData = onCall(async (request) => {
  // 1. Check authentication
  // v2: 'auth' is on 'request.auth', not 'context.auth'
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action.",
    );
  }
  const uid = request.auth.uid;
  
  // v2: 'data' is on 'request.data', not the first argument
  const { cafeId, daysToKeep } = request.data;

  if (!cafeId || !daysToKeep) {
    throw new HttpsError(
      "invalid-argument",
      "Missing 'cafeId' or 'daysToKeep' parameter.",
    );
  }

  try {
    // 2. Security Check: Verify the caller owns this cafe
    const cafeRef = db.collection("cafes").doc(cafeId);
    const cafeDoc = await cafeRef.get();

    if (!cafeDoc.exists) {
      throw new HttpsError("not-found", "Cafe not found.");
    }

    if (cafeDoc.data()?.ownerUserId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You are not the owner of this cafe.",
      );
    }

    // 3. Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    // 4. Create queries for old data
    const oldOrdersQuery = db
      .collection("orders")
      .where("cafeId", "==", cafeId)
      .where("createdAt", "<", cutoffTimestamp);

    const oldRequestsQuery = db
      .collection("requests")
      .where("cafeId", "==", cafeId)
      .where("createdAt", "<", cutoffTimestamp);

    // 5. Run deletions
    const ordersDeleted = await deleteQuery(oldOrdersQuery);
    const requestsDeleted = await deleteQuery(oldRequestsQuery);

    const totalDeleted = ordersDeleted + requestsDeleted;

    return { success: true, deletedCount: totalDeleted };
  } catch (error: any) {
    console.error("Purge failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "An internal server error occurred.",
    );
  }
});