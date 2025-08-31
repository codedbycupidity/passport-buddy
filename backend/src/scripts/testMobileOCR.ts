import { parseBoardingPassWithSimpletexV3 } from '../utils/boardingPassSimpletexV3';
import fs from 'fs';
import path from 'path';

// Configure environment
process.env.SIMPLETEX_API_KEY = '68sybsS7o4xDAfO0K2krSKfIYZcYkYycRNiPIdQmsmcoSfGSOQgq3LwZOQrJ8Ld4';

async function testMobileImages() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  
  // Mobile test images
  const mobileImages = [
    'boardingpassmobilegoodquality.jpg',
    'boardingpassmobilezoomedout.jpg'
  ];
  
  console.log('=== Testing Mobile Boarding Pass OCR with Enhanced Preprocessing ===\n');
  
  for (const imageName of mobileImages) {
    const imagePath = path.join(testImagesDir, imageName);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }
    
    console.log(`\n📱 Testing: ${imageName}`);
    console.log('─'.repeat(50));
    
    try {
      const buffer = fs.readFileSync(imagePath);
      const mimeType = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      const result = await parseBoardingPassWithSimpletexV3(buffer, mimeType);
      
      if (result.success && result.data) {
        console.log('✅ OCR Success!');
        console.log('\nExtracted Data:');
        console.log(`  Flight: ${result.data.flightNumber || 'Not found'}`);
        console.log(`  Route: ${result.data.origin?.airportCode || '???'} → ${result.data.destination?.airportCode || '???'}`);
        console.log(`  Passenger: ${result.data.passengerName || 'Not found'}`);
        console.log(`  Date: ${result.data.flightDate || 'Not found'}`);
        console.log(`  Gate: ${result.data.gate || 'Not found'}`);
        console.log(`  Seat: ${result.data.seat || 'Not found'}`);
        
        if (result.requiresManualEntry) {
          console.log('\n⚠️  Fields requiring manual entry:', result.requiresManualEntry);
        }
        
        if (result.data.extractionMetadata?.ocrConfidence) {
          console.log(`\n  OCR Confidence: ${(result.data.extractionMetadata.ocrConfidence * 100).toFixed(1)}%`);
        }
      } else {
        console.log('❌ OCR Failed');
        if (result.errors) {
          console.log('\nErrors:');
          result.errors.forEach(error => {
            console.log(`  - ${error.field}: ${error.message}`);
            console.log(`    Suggestion: ${error.suggestion}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error processing image:', error);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testMobileImages().catch(console.error);