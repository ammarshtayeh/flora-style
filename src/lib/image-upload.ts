const IMAGE_EXTENSIONS: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  jfif: "image/jpeg",
  jpe: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jxl: "image/jxl",
  png: "image/png",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const IMAGE_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/vnd.microsoft.icon": "image/x-icon",
};

export function isAcceptedImageFile(file: File) {
  const type = file.type?.toLowerCase() ?? "";
  if (type.startsWith("image/") && type.length > 6) {
    return true;
  }
  if (type in IMAGE_MIME_ALIASES) {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && extension in IMAGE_EXTENSIONS);
}

export function resolveImageContentType(file: File) {
  const type = file.type?.toLowerCase() ?? "";
  if (type in IMAGE_MIME_ALIASES) {
    return IMAGE_MIME_ALIASES[type];
  }
  if (type.startsWith("image/") && type.length > 6) {
    return type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && extension in IMAGE_EXTENSIONS) {
    return IMAGE_EXTENSIONS[extension];
  }

  return undefined;
}
