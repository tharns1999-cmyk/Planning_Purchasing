// Routes.gs
// Router utility to direct incoming GET and POST requests based on request paths

function handleRoute(method, path, params, body) {
  var normalizedPath = path ? path.replace(/\/+$/, "") : "";
  
  if (method === "GET") {
    switch (normalizedPath) {
      case "/customers":
        return successResponse(getCustomers());
      case "/products":
        return successResponse(getProducts());
      case "/orders":
        return successResponse(getOrders());
      case "/planning":
        var weekStartIso = params && params.weekStartIso ? params.weekStartIso[0] : "";
        return successResponse(getPlanning(weekStartIso));
      default:
        return errorResponse("Route not found: GET " + path, 404);
    }
  } else if (method === "POST") {
    var payload;
    try {
      payload = body ? JSON.parse(body) : {};
    } catch (e) {
      return errorResponse("Invalid JSON payload", 400);
    }

    switch (normalizedPath) {
      case "/orders":
        return successResponse(createOrder(payload));
      case "/planning/allocations":
        return successResponse(createAllocation(payload));
      case "/actuals":
        return successResponse(createActual(payload));
      default:
        return errorResponse("Route not found: POST " + path, 404);
    }
  }

  return errorResponse("Unsupported HTTP method: " + method, 405);
}
