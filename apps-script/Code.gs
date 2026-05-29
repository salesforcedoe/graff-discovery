// Graff Discovery — Drive Upload Endpoint
// Deploys as a public Apps Script web app. Notetaker app POSTs JSON; this writes
// the markdown file to a Drive folder owned by whoever deploys this script.

const FOLDER_ID = "1vv2DLfhteylAx76_7lRI4aLTyYD3_grP";
const SHARED_SECRET = "graff-2026-discovery"; // must match GRAFF_UPLOAD_SECRET in config.js

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SHARED_SECRET) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const filename = sanitizeFilename(body.filename || "graff-notes.md");
    const content = String(body.content || "");

    if (content.length === 0) {
      return json({ ok: false, error: "Empty content" }, 400);
    }
    if (content.length > 5 * 1024 * 1024) {
      return json({ ok: false, error: "File too large (5MB max)" }, 400);
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const blob = Utilities.newBlob(content, "text/markdown", filename);
    const file = folder.createFile(blob);

    return json({
      ok: true,
      fileId: file.getId(),
      url: file.getUrl(),
      filename: file.getName()
    });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

function doGet() {
  return json({ ok: true, status: "Graff upload endpoint is live. POST JSON to upload." });
}

function json(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFilename(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
  if (!/\.md$/i.test(cleaned)) return cleaned + ".md";
  return cleaned;
}
