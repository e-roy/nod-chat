/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { initializeGenkit } from "./ai/genkit";

// Initialize Genkit on cold start
initializeGenkit();

// Import presence functions
export {
  mirrorPresenceToFirestore,
  updatePresenceInFirestore,
  removePresenceFromFirestore,
} from "./presence";

// Import messaging functions
export { onChatMessageCreated, onGroupMessageCreated } from "./messaging";

// Import AI analysis functions
export {
  generateChatSummary,
  extractChatActionItems,
  extractChatDecisions,
  searchChatMessages,
} from "./ai/analysis";

// Import AI trigger functions
export {
  onChatMessageCreatedDetectPriority,
  onGroupMessageCreatedDetectPriority,
  onChatMessageCreatedExtractCalendar,
  onGroupMessageCreatedExtractCalendar,
} from "./ai/triggers";

// Import AI speech-to-text function
export { transcribeAudio } from "./ai/speechToText";

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });
