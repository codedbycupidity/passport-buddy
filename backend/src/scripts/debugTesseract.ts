import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';

async function debugTesseract() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  const imagePath = path.join(testImagesDir, 'boardingpassmobilegoodquality.jpg');
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Image not found: ${imagePath}`);
    return;
  }
  
  console.log('=== Debugging Tesseract Output Structure ===\n');
  
  const buffer = fs.readFileSync(imagePath);
  const worker = await createWorker('eng');
  
  try {
    // Set parameters
    await worker.setParameters({
      tessedit_pageseg_mode: 3 as any,
      preserve_interword_spaces: '1',
    });
    
    // Perform OCR
    const result = await worker.recognize(buffer);
    
    console.log('Top level keys:', Object.keys(result));
    console.log('\nData keys:', Object.keys(result.data));
    console.log('\nConfidence:', result.data.confidence);
    console.log('Text length:', result.data.text.length);
    
    // Check structure
    console.log('\nChecking data structure:');
    console.log('- Has lines?', 'lines' in result.data);
    console.log('- Has blocks?', 'blocks' in result.data);
    console.log('- Has paragraphs?', 'paragraphs' in result.data);
    console.log('- Has words?', 'words' in result.data);
    
    if (result.data.blocks) {
      console.log('\nBlocks count:', result.data.blocks.length);
      console.log('First block structure:', Object.keys(result.data.blocks[0] || {}));
    }
    
    if ((result.data as any).lines) {
      console.log('\nLines count:', (result.data as any).lines.length);
      console.log('First line:', (result.data as any).lines[0]?.text);
    }
    
    if ((result.data as any).words) {
      console.log('\nWords count:', (result.data as any).words.length);
      console.log('First 5 words:', (result.data as any).words.slice(0, 5).map((w: any) => w.text));
    }
    
    // Extract relevant info
    console.log('\n=== Extracted Info ===');
    const text = result.data.text.toUpperCase();
    
    // Flight number
    const flightMatch = text.match(/([A-Z]{2})\s*(\d{3,4})/);
    if (flightMatch) {
      console.log('Flight:', flightMatch[0]);
    }
    
    // Route
    const routeMatch = text.match(/([A-Z]{3})\s*[-→]\s*([A-Z]{3})/);
    if (routeMatch) {
      console.log('Route:', routeMatch[1], '→', routeMatch[2]);
    }
    
    // Time
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (timeMatch) {
      console.log('Time:', timeMatch[0]);
    }
    
    // Gate
    const gateMatch = text.match(/GATE\s*([A-Z]?\d+[A-Z]?)/i);
    if (gateMatch) {
      console.log('Gate:', gateMatch[1]);
    }
    
    // Seat
    const seatMatch = text.match(/SEAT\s*(\d+[A-Z])/i);
    if (seatMatch) {
      console.log('Seat:', seatMatch[1]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await worker.terminate();
  }
}

debugTesseract().catch(console.error);