const { google } = require('googleapis');
const stream = require('stream');
const {
  clientId,
  clientSecret,
  redirectUri,
  prescriptionFolderId,
  metaImageFolderId,
  refreshToken
} = require('../config/vars');

exports.uploadPdfToGoogleDrive = async (pdfBuffer, fileName) => {
  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  auth.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [prescriptionFolderId]
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

    // // Get the public URL
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

exports.uploadImageToGoogleDrive = async (base64String, fileName) => {
  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  auth.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [metaImageFolderId] // The folder where the file will be saved
  };

  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

  const pdfBuffer = Buffer.from(base64Data, 'base64');

  const bufferStream = new stream.PassThrough();
  bufferStream.end(pdfBuffer);

  const media = {
    mimeType: 'image/png',
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
