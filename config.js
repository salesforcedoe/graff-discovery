// Drive upload endpoint (Apps Script web app deployed by Sam).
// Replace the URL below with the deployed /exec URL after deployment.
window.GRAFF_UPLOAD_URL = "https://script.google.com/a/macros/salesforce.com/s/AKfycbyV92ITZg2mrH0A7hz4Acq4E6PQv7II8Q6y8IUvB1_tC5VgIwt0KLhlJfHwvt7tg5EJww/exec";

// Shared secret — must match SHARED_SECRET in the Apps Script.
// Not a real auth boundary; just a spam guard.
window.GRAFF_UPLOAD_SECRET = "graff-2026-discovery";

// Drive folder URL (informational — actual folder ID lives in the Apps Script).
window.GRAFF_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1vv2DLfhteylAx76_7lRI4aLTyYD3_grP";
