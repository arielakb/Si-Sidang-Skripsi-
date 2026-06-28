export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
    path: req.originalUrl
  });
}