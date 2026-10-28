/**
 * Client-Side Product Image Processor
 * Handles validation, size check, and canvas-based compression
 * for persistent storage in localStorage / IndexedDB.
 */

export const processProductImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file selected"));
    }

    // 1. Validate file type (JPG, JPEG, PNG, WEBP)
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileName = file.name || "";
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    const isTypeValid =
      validMimeTypes.includes(file.type) || validExtensions.includes(fileExt);

    if (!isTypeValid) {
      return reject(
        new Error(
          "Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP image."
        )
      );
    }

    // 2. Validate file size (max 5 MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return reject(
        new Error(
          `Image size (${sizeMB} MB) exceeds the 5 MB limit. Please select a smaller photo.`
        )
      );
    }

    // 3. Read file as Data URL
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read the image file. Please try again."));
    };

    reader.onload = (e) => {
      const rawDataUrl = e.target?.result;
      if (!rawDataUrl) {
        return reject(new Error("Failed to load image data."));
      }

      const img = new Image();

      img.onerror = () => {
        reject(
          new Error("Unable to parse image data. The file may be corrupted.")
        );
      };

      img.onload = () => {
        try {
          // Optimize dimensions to max 1000px for sharp e-commerce display
          const maxDimension = 1000;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            return resolve({
              dataUrl: rawDataUrl,
              fileName: file.name,
              fileSize: file.size,
            });
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to WebP (fallback to JPEG)
          let optimizedDataUrl = canvas.toDataURL("image/webp", 0.85);
          if (!optimizedDataUrl.startsWith("data:image/webp")) {
            optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          }

          resolve({
            dataUrl: optimizedDataUrl,
            fileName: file.name,
            fileSize: file.size,
            width,
            height,
          });
        } catch {
          // Safe fallback
          resolve({
            dataUrl: rawDataUrl,
            fileName: file.name,
            fileSize: file.size,
          });
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
};

