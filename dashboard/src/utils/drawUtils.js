/**
 * Class configuration for detection visualisation.
 * class_id 0 = Crack (orange), class_id 1 = Pothole (red).
 */
const CLASS_CONFIG = {
  0: { label: 'Crack', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  1: { label: 'Pothole', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
};

/**
 * Draw all detection bounding boxes on a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D context of the overlay canvas.
 * @param {Array} detections - Array of detection objects from the API.
 * @param {number} scaleX - Horizontal scale factor (displayedWidth / originalWidth).
 * @param {number} scaleY - Vertical scale factor (displayedHeight / originalHeight).
 */
export const drawDetections = (ctx, detections, scaleX, scaleY) => {
  detections.forEach((det) => {
    const { class_id, confidence_score, bounding_box } = det;
    const config = CLASS_CONFIG[class_id] || CLASS_CONFIG[0];

    // Scale coordinates from original image space → displayed space
    const x = bounding_box.x_min * scaleX;
    const y = bounding_box.y_min * scaleY;
    const w = (bounding_box.x_max - bounding_box.x_min) * scaleX;
    const h = (bounding_box.y_max - bounding_box.y_min) * scaleY;

    // Draw filled background
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(x, y, w, h);

    // Draw bounding box
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Draw label
    const label = `${config.label} ${(confidence_score * 100).toFixed(1)}%`;
    ctx.font = 'bold 13px Inter, sans-serif';
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 18;
    const padding = 6;

    // Label background
    const labelX = x;
    const labelY = y - textHeight - padding + 2;

    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, textWidth + padding * 2, textHeight + padding, [4, 4, 0, 0]);
    ctx.fill();

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX + padding, y - padding + 2);
  });
};

/**
 * Clear the entire canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
export const clearCanvas = (ctx, canvas) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};
