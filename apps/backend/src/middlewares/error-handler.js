export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Data sudah digunakan atau duplikat",
      detail: error.meta?.target ?? null
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Data tidak ditemukan"
    });
  }

  if (error.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada server"
  });
}