// Response.gs
// Standard response format helpers for REST API responses

function successResponse(data) {
  var response = {
    success: true,
    data: data || {}
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, statusCode) {
  var response = {
    success: false,
    message: message || "An unknown error occurred"
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
