import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function testRawOCR() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  
  // Test all available images
  const testImages = [
    'boardingpassmobilegoodquality.jpg',
    'boardingpassmobilezoomedout.jpg',
    'bestquality.png',
    'worstquality.png',
    'zoomedoutquality.png'
  ];
  
  console.log('=== Raw OCR Testing ===\n');
  
  const worker = await createWorker('eng');
  
  for (const imageName of testImages) {
    const imagePath = path.join(testImagesDir, imageName);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }
    
    console.log(`\n📄 Testing: ${imageName}`);
    console.log('─'.repeat(50));
    
    try {
      const buffer = fs.readFileSync(imagePath);
      
      // Get image info
      const metadata = await sharp(buffer).metadata();
      console.log(`Image info: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
      
      // Test 1: Raw OCR (no preprocessing)
      console.log('\n1. Raw OCR:');
      const rawResult = await worker.recognize(buffer);
      console.log(`   Confidence: ${rawResult.data.confidence}%`);
      console.log(`   Text length: ${rawResult.data.text.length} chars`);
      if (rawResult.data.text.trim()) {
        console.log(`   First 200 chars: ${rawResult.data.text.substring(0, 200).replace(/\n/g, ' ')}`);
      } else {
        console.log('   No text detected');
      }
      
      // Test 2: Simple grayscale
      console.log('\n2. Grayscale OCR:');
      const grayscaleBuffer = await sharp(buffer).grayscale().toBuffer();
      const grayscaleResult = await worker.recognize(grayscaleBuffer);
      console.log(`   Confidence: ${grayscaleResult.data.confidence}%`);
      console.log(`   Text length: ${grayscaleResult.data.text.length} chars`);
      
      // Test 3: Enhanced contrast
      console.log('\n3. Enhanced contrast OCR:');
      const enhancedBuffer = await sharp(buffer)
        .grayscale()
        .normalize()
        .toBuffer();
      const enhancedResult = await worker.recognize(enhancedBuffer);
      console.log(`   Confidence: ${enhancedResult.data.confidence}%`);
      console.log(`   Text length: ${enhancedResult.data.text.length} chars`);
      
      // Find key information
      const text = enhancedResult.data.text.toUpperCase();
      const flightMatch = text.match(/([A-Z]{2})\s*(\d{3,4})/);
      const airportMatch = text.match(/([A-Z]{3})\s*[→-]\s*([A-Z]{3})/);
      
      if (flightMatch) {
        console.log(`\n   ✈️  Flight found: ${flightMatch[0]}`);
      }
      if (airportMatch) {
        console.log(`   🛫 Route found: ${airportMatch[1]} → ${airportMatch[2]}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
  
  await worker.terminate();
  console.log('\n=== Test Complete ===');
}

// Run the test
testRawOCR().catch(console.error);