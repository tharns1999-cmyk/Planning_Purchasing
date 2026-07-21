// Code.gs
// Entry point for handling HTTP request triggers in Google Apps Script

function doGet(e) {
  var path = e.parameter.path || "/";
  return handleRoute("GET", path, e.parameters, null);
}

function doPost(e) {
  var path = e.parameter.path || "/";
  var body = e.postData ? e.postData.contents : "";
  return handleRoute("POST", path, e.parameters, body);
}
