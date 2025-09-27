// Simple script to create base64 encoded PNG icons
// Run this in a browser console to generate icon data

function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#007bff');
    gradient.addColorStop(1, '#0056b3');
    
    // Draw background circle
    const margin = size * 0.1;
    const radius = (size - margin * 2) / 2;
    const centerX = size / 2;
    const centerY = size / 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, size / 32);
    ctx.stroke();
    
    // Draw simple clothing hanger icon
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, size / 64);
    
    // Hanger hook (small circle)
    const hookSize = size * 0.06;
    ctx.beginPath();
    ctx.arc(centerX, centerY - size * 0.25, hookSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Hanger bar (horizontal line)
    const barWidth = size * 0.4;
    const barHeight = size * 0.04;
    ctx.fillRect(centerX - barWidth / 2, centerY - size * 0.2, barWidth, barHeight);
    
    // Clothing outline (simple rectangle)
    const clothingWidth = size * 0.3;
    const clothingHeight = size * 0.25;
    ctx.beginPath();
    ctx.rect(centerX - clothingWidth / 2, centerY - size * 0.05, clothingWidth, clothingHeight);
    ctx.stroke();
    
    // Add small sparkle for AI indication
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(centerX + size * 0.2, centerY - size * 0.1, size * 0.02, 0, 2 * Math.PI);
    ctx.fill();
    
    return canvas.toDataURL('image/png');
}

// Generate icons and log base64 data
console.log('=== AI Virtual Try-On Icons ===');
[16, 32, 48, 128].forEach(size => {
    const dataUrl = createIcon(size);
    console.log(`\n--- icon${size}.png ---`);
    console.log(dataUrl);
});
