const path = require('path');
const stream = require('stream');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

exports.uploadToGoogleDrive = async (pdfBuffer, fileName) => {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: ['10pBVAO7MnCdbBaTNLa8vlidqxIvwHu1U'] // Optional: Folder ID to save the file in a specific folder
  };

  // Convert the Uint8Array to a Buffer
  const bufferStream = new stream.PassThrough();
  bufferStream.end(pdfBuffer);

  const media = {
    mimeType: 'application/pdf',
    body: bufferStream
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });

    const fileId = response.data.id;

    // Generate a public link
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Get the public URL
    const result = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink'
    });

    return result.data.webViewLink; // Returns the link to view the file
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error.message);
    throw new Error('Failed to upload file to Google Drive');
  }
};
